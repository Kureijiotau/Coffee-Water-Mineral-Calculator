export const WATERMANCER_GUIDE_SALT_PRODUCTS = {
  nigari: {
    id: 'nigari',
    label: 'Nigari',
    imageUrl: 'https://foodsofnations.com/cdn/shop/products/daf7f988103e9107f33a5013b0c92784.jpg?v=1653932166&width=1946',
    sourceUrl: 'https://foodsofnations.com/products/nigari-flakes',
    sourceLabel: 'Food of Nations',
    alt: 'Food of Nations magnesium chloride and nigari flakes',
  },
  saltverk: {
    id: 'saltverk',
    label: 'Saltverk',
    imageUrl: 'https://saltverk.com/cdn/shop/files/Saltverk_FlakySalt.png?v=1781557939&width=1946',
    sourceUrl: 'https://saltverk.com/products/saltverk-pure-flaky-sea-salt',
    sourceLabel: 'Saltverk',
    alt: 'Jar of Saltverk Flaky Sea Salt',
  },
  'vera-salt': {
    id: 'vera-salt',
    label: 'Vera Salt',
    imageUrl: 'https://verasalt.co/cdn/shop/files/Fine_Front_-_V2.png?v=1774573085&width=1946',
    sourceUrl: 'https://verasalt.co/products/fine-pure-natural-spring-salt-300g-microplastic-free',
    sourceLabel: 'Vera Salt',
    alt: 'Vera Salt fine spring salt package',
  },
  'arm-and-hammer': {
    id: 'arm-and-hammer',
    label: 'Arm & Hammer',
    imageUrl: 'https://www.armandhammer.com/-/media/aah/feature/product/bakingsoda/baking-soda-new/baking-soda-8-oz.jpg',
    sourceUrl: 'https://www.armandhammer.com/en/baking-soda/baking-soda-products/pure-baking-soda/baking-soda-box-8-oz',
    sourceLabel: 'Arm & Hammer',
    alt: 'Arm & Hammer Baking Soda Box',
  },
} as const;

export type GuideSaltProductId = keyof typeof WATERMANCER_GUIDE_SALT_PRODUCTS;
