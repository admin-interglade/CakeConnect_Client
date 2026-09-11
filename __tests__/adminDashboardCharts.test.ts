import { toTopProducts } from '../src/services/mappers/admin';

describe('admin dashboard chart mapping', () => {
  it('maps product rows returned with productName', () => {
    expect(
      toTopProducts({
        byProduct: [
          { productId: 'p1', productName: 'Chocolate Cake', quantity: 6 },
        ],
      }),
    ).toEqual([
      {
        productId: 'p1',
        name: 'Chocolate Cake',
        quantity: 6,
        unit: '',
      },
    ]);
  });

  it('keeps a product row when the backend omits productId', () => {
    expect(
      toTopProducts({
        byProduct: [{ productName: 'Vanilla Cake', quantity: '3' }],
      }),
    ).toEqual([
      {
        productId: 'Vanilla Cake',
        name: 'Vanilla Cake',
        quantity: 3,
        unit: '',
      },
    ]);
  });
});
