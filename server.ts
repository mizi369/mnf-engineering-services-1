import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Client, LocalAuth } from "whatsapp-web.js";
import QRCode from "qrcode";

async function startServer() {
  const app = express();
  const PORT = 3000;

  let qrCodeDataUrl: string | null = null;
  let isReady = false;
  let profilePicUrl: string | null = null;

  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', async (qr) => {
    console.log('QR RECEIVED', qr);
    try {
      qrCodeDataUrl = await QRCode.toDataURL(qr);
    } catch (err) {
      console.error('Failed to generate QR code data URL', err);
    }
  });

  client.on('ready', async () => {
    console.log('Client is ready!');
    isReady = true;
    qrCodeDataUrl = null;
    
    try {
      // Get the profile picture of the connected account
      const contact = await client.getContactById(client.info.wid._serialized);
      profilePicUrl = await contact.getProfilePicUrl();
      console.log('Profile Pic URL:', profilePicUrl);
    } catch (err) {
      console.error('Failed to get profile pic', err);
    }
  });

  client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    isReady = false;
    profilePicUrl = null;
    client.initialize();
  });

  // Start initializing the client
  client.initialize().catch(err => {
    console.error('Failed to initialize WhatsApp client:', err);
  });

  // API Routes
  app.get("/api/whatsapp/status", (req, res) => {
    res.json({
      isReady,
      qrCode: qrCodeDataUrl,
      profilePicUrl
    });
  });

  app.post("/api/whatsapp/logout", async (req, res) => {
    try {
      await client.logout();
      isReady = false;
      profilePicUrl = null;
      qrCodeDataUrl = null;
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to logout' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
