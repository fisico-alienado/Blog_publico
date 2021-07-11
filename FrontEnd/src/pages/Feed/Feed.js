import React, { Component, Fragment } from 'react';
import openSocket from 'socket.io-client'

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };

  componentDidMount() {
    fetch('http://localhost:8080/auth/status', {
      // Adjuntamos el token para que el Backend VALIDE el token y desbloque las rutas y el funcionamiento de la App, mediante un HEADER.
      // Para ello en el BACKEND tengo puesto res.setHeader('Access-Control-Allow-Headers', 'Content-Type', 'Authorization'), si no no funcionaría esto.
      headers: {
        Authorization: "Bearer " + this.props.token // this.props.token permite obtener el token en esta aplicación de React.
      }
    })
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch user status.');
        }
        return res.json();
      })
      .then(resData => {
        this.setState({ status: resData.status });
      })
      .catch(this.catchError);

    this.loadPosts();
    // Definimos la URL del servidor donde hemos establecido el servidor socket.io, es decir, nuestro servidor Backend, que está en el puerto 8080
    // La dirección sigue siendo con http porque WebSockets se construye con/encima de http.
    // Socket = la conexión que se abrió ¿en el Back en app.js?
    const socket = openSocket('http://localhost:8080')
    // Desde el Back estamos enviando con .getIO().emit() el evento 'posts', por lo que tenemos que escucharlo con .on() aquí con el mismo nombre.
    socket.on('posts', data => {
      // 'action' la estamos pasando desde el Backend con .emit()
      if (data.action === 'create') {
        // .post es el post creado que nos está enviando el server la info desde createPost(), donde le hemos metido Socket.io
        this.addPost(data.post)
      } else if (data.action === 'update') {
        this.updatePost(data.post)
      } else if (data.action === 'delete') {
        this.loadPosts()
      }
    })
  }

  // Actualizar nuestros datos existentes para que no tengamos que recargar la página en el Browser cuando alguien cree un nuevo Post (imaginemos que hay
  // un usuario A que crea un post y un usuario B que está navegando por la web le aparece en tiempo real, sin tener que recargar la página.)
  // Con este snippet, React modifica el DOM de la página.
  addPost = post => {
    this.setState(prevState => {
      const updatedPosts = [...prevState.posts];
      if (prevState.postPage === 1) {
        if (prevState.posts.length >= 2) {
          updatedPosts.pop();
        }
        updatedPosts.unshift(post);
      }
      return {
        posts: updatedPosts,
        totalPosts: prevState.totalPosts + 1
      };
    });
  }

  // Snipet utilizado con Socket.io para actualizar el DOM de la página cuando UPDATING
  updatePost = post => {
    this.setState(prevState => {
      const updatedPosts = [...prevState.posts];
      const updatedPostIndex = updatedPosts.findIndex(p => p._id === post._id);
      if (updatedPostIndex > -1) {
        updatedPosts[updatedPostIndex] = post;
      }
      return {
        posts: updatedPosts
      };
    });
  }
 // Método para cargar los Posts
  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }
    // Adjuntamos el token para que el Backend VALIDE el token y desbloque las rutas y el funcionamiento de la App, mediante un HEADER.
    // Para ello en el BACKEND tengo puesto res.setHeader('Access-Control-Allow-Headers', 'Content-Type', 'Authorization'), si no no funcionaría esto.
    fetch('http://localhost:8080/feed/posts?page=' + page, {
      headers: {
        Authorization: "Bearer " + this.props.token // this.props.token permite obtener el token en esta aplicación de React.
      }
    }) // URL del servidor, con la ruta a la que nos referimos
       // ? añade 'query parameters' a los que se puede acceder en el BACKEND con req.query
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch posts.');
        }
        return res.json();
      })
      .then(resData => {
        this.setState({
          posts: resData.posts.map(post => {
            return {
              ...post, // Extraemos todas las propiedades del post
              imagePath: post.imageUrl // imageUrl es el nombre dado a la variable que en el MODELO del Backend almacena la imagen
            }
          }),
          totalPosts: resData.totalItems,
          postsLoading: false
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    fetch('http://localhost:8080/auth/status', {
      method: 'PATCH',
      headers: {
        Authorization: "Bearer " + this.props.token, // this.props.token permite obtener el token en esta aplicación de React.
        // Como estamos enviando JSON data en el 'body', tenemos que configurar el 'Content-Type'
        'Content-Type': 'application/json'
      },
      // Lo que estamos enviando.
      body: JSON.stringify({
        status: this.state.status
      })
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Can't update status!");
        }
        return res.json();
      })
      .then(resData => {
        console.log(resData);
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = postData => {
    this.setState({
      editLoading: true
    });
    const formData = new FormData() // con esto también podemos añadir imágenes, porque con JSON  no se puede
    formData.append('title', postData.title)
    formData.append('content', postData.content)
    formData.append('image', postData.image)
    let url = 'http://localhost:8080/feed/post';
    let method = 'POST'
    if (this.state.editPost) {
      url = 'http://localhost:8080/feed/post/' + this.state.editPost._id; // de aquí sacamos la variable del Backend, 'postId'
      method= 'PUT'
    }

// Sobre el método 'fetch': https://developer.mozilla.org/es/docs/Web/API/Fetch_API/Utilizando_Fetch

    fetch(url, {
      method: method,
      /*headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: postData.title,
        content: postData.content
      })*/
      body: formData,
      headers: {
        Authorization: "Bearer " + this.props.token // this.props.token permite obtener el token en esta aplicación de React.
      }
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error('Creating or editing a post failed!');
        }
        return res.json();
      })
      .then(resData => {
        console.log(resData)
        const post = {
          _id: resData.post._id,
          title: resData.post.title,
          content: resData.post.content,
          creator: resData.post.creator,
          createdAt: resData.post.createdAt
        };
        this.setState(prevState => {
          return {
            isEditing: false,
            editPost: null,
            editLoading: false
          };
        });
      })
      .catch(err => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          error: err
        });
      });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    fetch('http://localhost:8080/feed/post/' + postId, {
      method: 'DELETE',
      headers: {
        Authorization: "Bearer " + this.props.token // this.props.token permite obtener el token en esta aplicación de React.
      }
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error('Deleting a post failed!');
        }
        return res.json();
      })
      .then(resData => {
        console.log(resData);
        // Con Socket.IO implementado, lo único que hacemos es recargar el DOM con los posts que hay sin borrar.
        this.loadPosts()
        /* this.setState(prevState => {
          const updatedPosts = prevState.posts.filter(p => p._id !== postId);
          return { posts: updatedPosts, postsLoading: false };
        }); */
      })
      .catch(err => {
        console.log(err);
        this.setState({ postsLoading: false });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, 'previous')}
              onNext={this.loadPosts.bind(this, 'next')}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString('en-US')}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
