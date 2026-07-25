export interface LocalUser {
  email: string;
  role: 'admin' | 'inventory' | 'clinical';
  name: string;
}

// Default user accounts seeded in localStorage if not already present
const DEFAULT_USERS = [
  {
    email: 'cardiologist@ssmc.com',
    password: 'ssmcadmin',
    role: 'admin' as const,
    name: 'Dr. V.D. Tripathi'
  },
  {
    email: 'inventory@ssmc.com',
    password: 'ssmcinventory',
    role: 'inventory' as const,
    name: 'Inventory Registrar'
  },
  {
    email: 'clinical@ssmc.com',
    password: 'ssmcclinical',
    role: 'clinical' as const,
    name: 'Clinical Operations Desk'
  }
];

// Initialize users table in localStorage if empty
export const initializeLocalUsers = () => {
  if (!localStorage.getItem('cathlab_local_users')) {
    localStorage.setItem('cathlab_local_users', JSON.stringify(DEFAULT_USERS));
  }
};

// Verify user credentials against local storage registry
export const verifyLocalCredentials = async (email: string, password: string): Promise<LocalUser> => {
  initializeLocalUsers();
  
  // Simulate network delay for realistic visual loading experience
  await new Promise(resolve => setTimeout(resolve, 800));

  const usersJson = localStorage.getItem('cathlab_local_users');
  if (!usersJson) {
    throw new Error('User registry not initialized.');
  }

  const users = JSON.parse(usersJson);
  const foundUser = users.find((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!foundUser) {
    throw new Error('Invalid email or password.');
  }

  if (foundUser.password !== password) {
    throw new Error('Invalid email or password.');
  }

  const sessionUser: LocalUser = {
    email: foundUser.email,
    role: foundUser.role,
    name: foundUser.name
  };

  return sessionUser;
};

// Update local user password in localStorage
export const updateLocalPassword = (email: string, oldPassword: string, newPassword: string): boolean => {
  initializeLocalUsers();
  const usersJson = localStorage.getItem('cathlab_local_users');
  if (!usersJson) return false;

  const users = JSON.parse(usersJson);
  const userIndex = users.findIndex((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());

  if (userIndex === -1) return false;
  if (users[userIndex].password !== oldPassword) return false;

  users[userIndex].password = newPassword;
  localStorage.setItem('cathlab_local_users', JSON.stringify(users));
  return true;
};
