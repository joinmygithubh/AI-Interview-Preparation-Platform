# AI Interview Coach — Steering

## Stack
- Frontend: React + Vite, Tailwind CSS, react-router-dom, axios, socket.io-client, recharts, framer-motion, lucide-react, react-hook-form, zod, react-hot-toast
- Backend: Node.js + Express, MongoDB + Mongoose, Socket.IO, OpenAI API, Cloudinary, Multer, Puppeteer, Nodemailer, bcryptjs, jsonwebtoken
- Auth: JWT Bearer token
- API response format: { success: true/false, data: {}, message: "" }
- Always use next(err) for Express error handling
- React: functional components + hooks only
- Tailwind dark mode: class strategy

## Structure
/client/src → components/ui, components/layout, pages, hooks, context, services, utils
/server → config, middleware, models, routes, services, socket, utils
