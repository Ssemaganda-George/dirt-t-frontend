export interface Partner {
  name: string;
  logo: string; // URL or import path
  website: string;
}

export const partners: Partner[] = [
  {
    name: 'Acme Safaris',
    logo: '/partners/acme-safaris-logo.png',
    website: 'https://acmesafaris.com',
  },
  {
    name: 'Green Lodges',
    logo: '/partners/green-lodges-logo.png',
    website: 'https://greenlodges.com',
  },
  {
    name: 'TravelPro',
    logo: '/partners/travelpro-logo.png',
    website: 'https://travelpro.com',
  },
];
