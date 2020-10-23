const jwt = require('jsonwebtoken');

const verifyAuth = (token) => {
    try {
        let decoded = jwt.verify(token, 'wysiwyg')
        // console.log(decoded, 'decoded')
        return decoded;
    }catch{
     return false   
    }
}

module.exports = verifyAuth;