const FIRST_NAMES = [
  'Aditya', 'Aarav', 'Rohan', 'Vikram', 'Priya', 'Ananya', 'Rajesh',
  'Suresh', 'Kavita', 'Sanjay', 'Deepak', 'Neha', 'Sunita', 'Manish',
  'Pooja', 'Rahul', 'Arjun', 'Meera', 'Gaurav', 'Shweta', 'Amit',
  'Divya', 'Nikhil', 'Tanvi', 'Abhishek', 'Swati', 'Harish', 'Pallavi'
];

const LAST_NAMES = [
  'Nambiar', 'Deshmukh', 'Sharma', 'Verma', 'Patel', 'Iyer', 'Chatterjee',
  'Mukherjee', 'Reddy', 'Chauhan', 'Bhattacharya', 'Menon', 'Kulkarni',
  'Sengupta', 'Mishra', 'Agarwal', 'Pillai', 'Rao', 'Nair', 'Pandey',
  'Bhardwaj', 'Malhotra', 'Bose', 'Thakur', 'Garg', 'Choudhury', 'Kashyap'
];

const TITLES = ['Dr.', 'Prof.', 'Er.', 'Shri', 'Smt.'];

export const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export const getRandomFullName = (): string => {
  const first = getRandomItem(FIRST_NAMES);
  const last = getRandomItem(LAST_NAMES);
  return `${first} ${last}`;
};

export const getRandomAcademicName = (): string => {
  const title = getRandomItem(TITLES);
  const first = getRandomItem(FIRST_NAMES);
  const last = getRandomItem(LAST_NAMES);
  return `${title} ${first} ${last}`;
};

export const getInitials = (fullName: string): string => {
  const clean = fullName.replace(/^(Dr\.|Prof\.|Er\.|Shri|Smt\.|Ar\.)\s+/i, '').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
