export interface Repository {
     id: number;
     name: string;
     full_name: string;
     description: string | null;
     html_url: string;
     stargazers_count: number;
     forks_count: number;
     language: string | null;
     pushed_at: string;
     owner: {
          login: string;
          avatar_url: string;
     };
}
