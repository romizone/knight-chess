import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      tokenBalance?: number;
      rating?: number;
      totalGames?: number;
      wins?: number;
    };
  }

  interface User {
    id: string;
    tokenBalance?: number;
    rating?: number;
    totalGames?: number;
    wins?: number;
  }
}
