import * as vscode from 'vscode';
import * as google_auth from 'google-auth-library';

export class GoogleAuth {
    oAuth2Client: google_auth.OAuth2Client;

    constructor() {
        this.oAuth2Client = new google_auth.OAuth2Client({
        redirectUri: "urn:ietf:wg:oauth:2.0:oob"
        });
    }
  
    getAuthorizeUrl(): string {
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
  
    async setRefreshClient(authCode: string): Promise<google_auth.UserRefreshClient> {
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
        refreshToken: r.tokens.refresh_token
      });
      refreshClient.getRequestHeaders();
  
      return refreshClient;
    }
  }
  