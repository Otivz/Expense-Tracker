export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Hashed password
  vault_password?: string; // Hashed vault combination code
  created_at?: string;
  updated_at?: string;
}
