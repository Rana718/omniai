# PDF Chater Frontend

A modern, responsive Next.js web application for the PDF Chater platform that allows users to upload documents and chat with them using AI.

## Features

- **User Authentication**: Secure login, registration, and profile management
- **Document Dashboard**: Upload, organize, and manage your documents
- **Interactive Chat Interface**: Natural language conversations with your documents
- **Real-time Processing**: Live feedback during document upload and processing
- **Responsive Design**: Optimized for both desktop and mobile experiences
- **Theme Support**: Light and dark mode with customizable UI elements
- **Accessibility**: WCAG 2.1 AA compliant components and interactions

## Tech Stack

- **Framework**: Next.js 15.3.2 with App Router
- **Language**: TypeScript 5.4+
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4 with custom theme
- **State Management**: Zustand for global state
- **Authentication**: NextAuth.js with JWT
- **HTTP Client**: Axios with request/response interceptors
- **Animation**: Framer Motion for smooth transitions
- **Form Handling**: React Hook Form with Zod validation
- **Testing**: Jest and React Testing Library

## Project Structure

```
frontend/
├── public/               # Static assets and images
├── src/
│   ├── app/             # Next.js app router
│   │   ├── (auth)/      # Authentication routes (login, register)
│   │   ├── (protected)/ # Protected routes requiring authentication
│   │   │   ├── chat/    # Document chat interface
│   │   │   ├── docs/    # Document management
│   │   │   └── home/    # User dashboard
│   │   ├── api/         # API routes and handlers
│   │   ├── globals.css  # Global styles
│   │   ├── layout.tsx   # Root layout with providers
│   │   └── page.tsx     # Landing page
│   ├── components/      # Reusable UI components
│   │   ├── ui/          # Base UI components
│   │   ├── chat/        # Chat-specific components
│   │   ├── docs/        # Document-specific components
│   │   └── layout/      # Layout components (header, sidebar)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and helpers
│   ├── services/        # API service integrations
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

Create a `.env.local` file with the following variables:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
NEXT_PUBLIC_API_URL=http://localhost:4050/api
NEXT_PUBLIC_AI_URL=http://localhost:4050/ai
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

## Key Components

### Authentication Flow

The application uses NextAuth.js for authentication with the following flow:
1. User enters credentials on login page
2. NextAuth.js sends request to the API service
3. On successful authentication, JWT token is stored
4. Protected routes check for valid token before rendering

### Document Upload Process

1. User selects files through the drag-and-drop interface
2. Files are validated for type and size
3. Progress indicator shows upload status
4. Files are sent to the AI service for processing
5. User is notified when processing is complete

### Chat Interface

The chat interface includes:
- Real-time message display
- Markdown rendering for formatted responses
- Code syntax highlighting
- Message history navigation
- Export conversation functionality

## Integration with Other Services

This frontend communicates with:
- **API Service**: For user authentication and data management
- **AI Model Service**: For document processing and question answering (via the API gateway)

## Performance Optimization

- Next.js App Router for improved routing performance
- Image optimization with next/image
- Component-level code splitting
- Memoization of expensive computations
- Debounced API requests for chat interactions

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
