import express from "express";
const router = express.Router();
import { oauth2Client } from "../config/google.js";

router.get('/api/auth/url', (req, res) => {
    try {
      const scopes = [
        'https://www.googleapis.com/auth/drive.readonly'
      ];
      
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });
      
      res.json({ url });
    } catch (error) {
      console.error('Error generating auth URL:', error);
      res.status(500).json({ error: 'Failed to generate authentication URL' });
    }
  });
  
  // OAuth callback handler
  router.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect('/?auth=missing-code');
    }
    
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      res.redirect('/?auth=success');
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      res.redirect('/?auth=error');
    }
  });

  export default router;
  