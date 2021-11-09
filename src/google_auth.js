const vscode = require('vscode');
const google_auth = require('google-auth-library');

export class GoogleAuth {
    constructor () {
        this.clientId = "845129514279-njboj9fbrordd88a0p9hi5k6i0oepgn0.apps.googleusercontent.com"; 
        this.oAuth2Client = new google_auth.OAuth2Client({
        clientId: this.clientId,
        redirectUri: "urn:ietf:wg:oauth:2.0:oob"
        });
    }
  
    getAuthorizeUrl () {
      const authorizeUrl = this.oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/bigquery',
            'https://www.googleapis.com/auth/cloud-platform',
            'https://www.googleapis.com/auth/drive'
        ],
        prompt: 'consent'
      });
  
      return authorizeUrl;
    }
  
    async setRefreshClient (authCode) {
      const r = await this.oAuth2Client.getToken(authCode);
  
      this.oAuth2Client.setCredentials(r.tokens);
  
      if (!this.oAuth2Client.credentials.access_token) {
        throw Error("No access_token was found.");
      }
  
      if (!r.tokens.refresh_token) {
        throw Error("No refresh_token was found.");
      }
  
      const tokenInfo = await this.oAuth2Client.getTokenInfo(
        this.oAuth2Client.credentials.access_token
      );
  
      vscode.window.showInformationMessage(`Successfully login to Google: ${JSON.stringify(tokenInfo, null, "  ")}`);
  
      const refreshClient = new google_auth.UserRefreshClient({
        clientId: this.clientId,
        refreshToken: r.tokens.refresh_token
      });
      refreshClient.getRequestHeaders();
  
      return refreshClient;
    }
  }
  