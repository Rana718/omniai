# PDF Chater Frontend

A Next.js web application for the PDF Chater project that allows users to upload PDF documents and chat with them using AI.

## Features

- User authentication and profile management
- PDF document upload and management
- Chat interface for asking questions about documents
- Responsive design with Tailwind CSS
- Protected routes for authenticated users

## Tech Stack

- **Framework**: Next.js 15.3.2
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Authentication**: NextAuth.js
- **HTTP Client**: Axios
- **Animation**: Framer Motion

## Project Structure

```
frontend/
├── public/               # Static assets
├── src/
│   ├── app/             # Next.js app router
│   │   ├── (auth)/      # Authentication routes
│   │   ├── (protected)/ # Protected routes
│   │   │   ├── chat/    # Chat interface
│   │   │   └── home/    # Dashboard
│   │   ├── api/         # API routes
│   │   ├── globals.css  # Global styles
│   │   ├── layout.tsx   # Root layout
│   │   └── page.tsx     # Landing page
│   ├── components/      # Reusable components
│   ├── const/           # Constants
│   ├── context/         # React context providers
│   ├── lib/             # Utility functions
│   ├── store/           # Zustand stores
│   └── types/           # TypeScript type definitions
├── .env                 # Environment variables
├── next.config.ts       # Next.js configuration
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun

### Environment Variables

Create a `.env` file with the following variables:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
API_URL=http://localhost:4050/api
```

### Installation

```bash
# Install dependencies
npm install
# or
yarn
# or
pnpm install
# or
bun install
```

### Development

```bash
# Run development server
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Building for Production

```bash
# Build the application
npm run build
# or
yarn build
# or
pnpm build
# or
bun build

# Start the production server
npm start
# or
yarn start
# or
pnpm start
# or
bun start
```

## Docker Deployment

The frontend is configured to be built and run as part of the main Docker Compose setup. See the root README.md for details.

## Integration with Other Services

This frontend communicates with:
- **API Service**: For user authentication and data management
- **AI Model Service**: For PDF processing and question answering (via the API gateway)

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
