const {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} = require("amazon-cognito-identity-js");

const poolData = {
  UserPoolId: "us-east-1_yLq07nFjp",
  ClientId: "1jpo6nviamf5obo8cluuo8e0j3",
};

function signInUser(username, password) {
  return new Promise((resolve, reject) => {
    const userPool = new CognitoUserPool(poolData);

    const userData = {
      Username: username,
      Pool: userPool,
    };

    const cognitoUser = new CognitoUser(userData);
    const authenticationDetails = new AuthenticationDetails({
      Username: username,
      Password: password,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        resolve({
          accessToken: result.getAccessToken().getJwtToken(),
          idToken: result.getIdToken().getJwtToken(),
          refreshToken: result.getRefreshToken().getToken(),
        });
      },
      onFailure: (err) => {
        reject(err);
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        resolve({
          newPasswordRequired: true,
          userAttributes,
          requiredAttributes,
        });
      },
    });
  });
}

module.exports = {
  signInUser,
};
