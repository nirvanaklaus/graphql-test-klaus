const express = require('express');
const { ApolloServer, gql, ApolloError } = require('apollo-server-express');
const Mongoose = require('mongoose');
const User = require('./models/users');
const Note = require('./models/notes');
const { hash, compare } = require('bcryptjs');
const jwt = require('jsonwebtoken')
const verifyAuth = require('./middleware/isauth');
const typeDefs = gql`


  input SignUpInput {
    email: String!
    password: String!
    confirmPassword: String!
  }
  input SignInInput {
    email: String!
    password: String!
  }
  input NoteDetails{
    title: String!
    author: String!
    content: String!
  }

  type User{
    id: ID!
    email: String!
    password: String!
    notes: [Note!]
    createdAt: String!
    updatedAt: String!
  }
  type Note{
    id: ID!
    title: String!
    author: User!
    content: String!
  }

  type Query {
    hello: String
    colour: String
    findNote(id: ID!): Note!
    getNotes(cursor: Int!): [Note!]
  }
  type Mutation{
    signUp(input: SignUpInput): User!
    signIn(input: SignInInput): User!
    createNote(input: NoteDetails): Note!
    updateNote(input: NoteDetails,id: ID!): Note!
    deleteNote(id: ID!): Note!
  }
`;

const context = ({ req }) => {
  let token = req.headers.authorization || '';
  // console.log(token, 'token')
  const authentication = verifyAuth(token);
  // console.log(authentication, 'authentication')
  return authentication;
}

const resolvers = {
  Query: {
    hello: () => 'Hello world!',
    colour: () => 'Red',
    findNote(parent, args) {
      const id = args.id;
      let returnThis;
      return Note.findById(id)
        .then(note => {
          note.title = details.title;
          note.content = details.content;
          note.author = note.author;
          return note.save()
            .then(note => {
              returnThis = { ...note._doc, id: note._id.toString(), createdAt: note.createdAt.toString(), updatedAt: note.updatedAt.toString() }
              return User.findById(note.author)
                .then(user => {
                  returnThis = { ...returnThis, author: { ...user._doc, id: user._id.toString(), createdAt: user.createdAt.toString(), updatedAt: user.updatedAt.toString() } }
                  // console.log(returnThis, user)
                  return returnThis;
                })
            })
            .catch(err => err)
        })
        .catch(err => err)

    },
    getNotes(parents, args) {
      let returnThis;
      let skip = args.cursor>0?args.cursor:1;
      return Note.find().skip((Number(skip)-1)*3).limit(3)
        .then(notes => {
          returnThis = notes.map(each => {
            if (!each.title) {
              each.title = ""
            }
            return each;
          })
          return returnThis;
        })
        .then(updatedNotes => {
          returnThis = updatedNotes;
          // console.log(returnThis);
          return returnThis;
        })
    }
  },

  Note: {
    author: (parent) => {
      let returnThis;
      // console.log(parent, 'parent')
      return User.findById(parent.author)
        .then(user => {
          returnThis = { ...user._doc, id: user._id.toString(), createdAt: user.createdAt.toString(), updatedAt: user.updatedAt.toString() }
          // console.log(returnThis, user)
          return returnThis;
        })
        .catch(err => err)
    }
  },
  User: {
    notes: (parent) => {
      let returnThis;
      // console.log(parent, 'parent')
      let notesArray = parent.notes.map(each => {
        // console.log(parent.notes)
        return Note.findById(each)
          .then(note => {
            return { ...note._doc, id: note._id.toString(), createdAt: note.createdAt.toString(), updatedAt: note.updatedAt.toString() }
          })
      })
      return Promise.all(notesArray)
        .then(result => {
          returnThis = result
          return returnThis;
        })
    }

  },

  Mutation: {
    signUp(parent, args, context, info) {
      const details = args.input;
      if (details.password === details.confirmPassword) {
        return User.findOne({ email: details.email })
          .then(user => {
            if (user) {
              const returnThis = { ...user._doc, id: user._id.toString(), createdAt: user.createdAt.toString(), updatedAt: user.updatedAt.toString() }
              // console.log(returnThis);
              return returnThis;
            } else {
              return hash(details.password, 12)
                .then(password => {
                  const user = new User({
                    email: details.email,
                    password: password,
                  })
                  return user.save()
                    .then(user => {
                      const returnThis = { ...user._doc, id: user._id.toString(), createdAt: user.createdAt.toString(), updatedAt: user.updatedAt.toString() }
                      // console.log(returnThis, 'created')
                      return returnThis;
                    })
                })
                .catch(err => {
                  return new Error('something went wrong')
                })

            }
          }).catch(err => {
            return new Error(err);
          })
      } else {
        return new Error('passwords must match')
      }
    },
    signIn(parent, args, context, info) {
      const details = args.input;
      return User.findOne({ email: details.email })
        .then(user => {
          if (user) {
            return compare(details.password.toString(), user.password.toString())
              .then(isCorrect => {
                if (!isCorrect) {
                  return new Error('email/password is wrong.')
                }
                const returnThis = { ...user._doc, id: user._id.toString(), createdAt: user.createdAt.toString(), updatedAt: user.updatedAt.toString() }
                const token = jwt.sign({ id: returnThis.id, email: returnThis.email }, 'wysiwyg', { expiresIn: "1h" })
                if (token) {
                  // console.log(returnThis, token);
                  return returnThis;
                }
              })
          } else {
            return new Error('email/password is wrong.')
          }
        })
        .catch(err => new Error('something went wrong.'))
    },
    createNote(parent, args, context, info) {
      if (!context.id) {
        return new ApolloError('Not authenticated!', 'app.js - line 207')
      }
      const details = args.input;
      let returnThis;
      const note = new Note({
        title: details.title,
        author: details.author,
        content: details.content
      })
      return note.save()
        .then(note => {
          returnThis = { ...note._doc, id: note._id.toString(), createdAt: note.createdAt.toString(), updatedAt: note.updatedAt.toString() }
          return User.findById(details.author)
            .then(user => {
              user.notes.push(returnThis._id)
              return user.save()
                .then(result => {
                  // console.log(returnThis, result)
                  return returnThis;
                })
            })
            .catch(err => err)
        })
        .catch(err => err)
    },
    updateNote(parent, args, context, info) {
      if (!context.id) {
        return new ApolloError('Not authenticated!', 'app.js - line 207')
      }
      const details = args.input;
      const id = args.id
      let returnThis;
      return Note.findById(id)
        .then(note => {
          note.title = details.title;
          note.content = details.content;
          note.author = note.author;
          return note.save()
            .then(note => {
              returnThis = { ...note._doc, id: note._id.toString(), createdAt: note.createdAt.toString(), updatedAt: note.updatedAt.toString() }
              // console.log(returnThis)
              return returnThis;
            })
        })
        .catch(err => err)
        .catch(err => err)
    },
    deleteNote(parent, args, context, info) {
      if (!context.id) {
        return new ApolloError('Not authenticated!', 'app.js - line 207')
      }
      const id = args.id
      let returnThis;

      return Note.findByIdAndRemove(id)
        .then(note => {
          if (!note) {
            return new Error('Note does not exist')
          }
          returnThis = { ...note._doc, id: note._id.toString(), createdAt: note.createdAt.toString(), updatedAt: note.updatedAt.toString() }
          return User.findById(note.author)
            .then(user => {
              user.notes.pull(id)
              return user.save()
                .then(result => {
                  // console.log(returnThis, result)
                  return returnThis;
                })
            })
        })
        .catch(err => err)
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers, context });

const app = express();
server.applyMiddleware({ app });

Mongoose.connect('mongodb+srv://nick:nikky@cluster0.fe1vp.mongodb.net/graphql', (err) => {
  if (err) {
    return console.log(err);
  }
  let port = process.env.PORT;
  if (port == null || port == "") {
    port = '4000';
  }
  app.listen(port, () => {
    console.log('Server live!')
    console.log('Now browse to http://localhost:4000' + server.graphqlPath)
  })
});