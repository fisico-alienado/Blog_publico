import React, { Component } from 'react';

import Image from '../../../components/Image/Image';
import './SinglePost.css';

class SinglePost extends Component {
  state = {
    title: '',
    author: '',
    date: '',
    image: '',
    content: ''
  };

  componentDidMount() {
    const postId = this.props.match.params.postId; // Extraemos 'postId' de la URL, porque a la ruta le hemos metido como variable/parámetro :postId
    fetch('http://localhost:8080/feed/post/' + postId, {
      headers: {
        Authorization: "Bearer " + this.props.token // this.props.token permite obtener el token en esta aplicación de React.
      }
    }) // Las variables en REACT en una ruta se ponen después del más, no como en Node.
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch status');
        }
        return res.json();
      })
      .then(resData => { // En vez de llamar a la respuesta como siempre 'res', aquí la llamamos 'resData'
        this.setState({ // Accedemos al objeto 'post' en el método getPost() del BACKEND.
          title: resData.post.title,
          author: resData.post.creator.name,
          image: 'http://localhost:8080/' + resData.post.imageUrl,
          date: new Date(resData.post.createdAt).toLocaleDateString('en-US'),
          content: resData.post.content
        });
      })
      .catch(err => {
        console.log(err);
      });
  }

  render() {
    return (
      <section className="single-post">
        <h1>{this.state.title}</h1>
        <h2>
          Created by {this.state.author} on {this.state.date}
        </h2>
        <div className="single-post__image">
          <Image contain imageUrl={this.state.image} />
        </div>
        <p>{this.state.content}</p>
      </section>
    );
  }
}

export default SinglePost;
