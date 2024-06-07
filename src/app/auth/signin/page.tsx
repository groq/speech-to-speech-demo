'use client';

import { getSession } from 'next-auth/react';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const session = getSession();

  session.then((session) => {
    if(session){
      window.location.href = '/';
    }
  })

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const result = await signIn('credentials', {
      redirect: false,
      username: email,
      password,
    });
    if (!result?.error) {
      router.push('/');
    } else {
      console.error(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit">Sign In</button>
    </form>
  );
}
