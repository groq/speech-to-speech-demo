# Speech-to-Speech Groq demo

## Environment variables
The following environment variables are used in this project:

- `GROQ_API_KEY`: API key for accessing Groq services. Get one [here](https://console.groq.com/).
- `CARTESIA_API_KEY`: API key for accessing Cartesia services (optional: required for text-to-speech abilities). Get one [here](https://play.cartesia.ai/console).

Rename `.env.local.example` and populate the values.

> **WARNING:** This demo app exposes the API keys in the browser. Assume your keys are readable in plain-text by anyone using the web application.

## Login

Username: dummy@groq.com

Password: groqspeed

You can change it here: `src/app/api/auth/[...nextauth]/route.ts`

These variables should be set in your `.env.local` file for local development.

## Happy Hacking!

What follows is the regular Next.js README in case you're not familiar with the Next.js framework.

---

# Next.js

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
