import { ChevronRight, MapPin } from 'lucide-react';

import type { Product } from '@/features/inventory/model/product';

interface ProductTableProps {
  products: Product[];
  onSelectProduct: (productId: string) => void;
  newProductIds?: ReadonlySet<string>;
  emptyTitle?: string;
  emptyDescription?: string;
}

function formatEthanolPercent(ethanolPercent: number | null): string {
  return ethanolPercent === null ? '-' : `${ethanolPercent}%`;
}

export function ProductTable({
  products,
  onSelectProduct,
  newProductIds = new Set<string>(),
  emptyTitle = '검색 결과가 없습니다',
  emptyDescription = '업체명이나 제품명을 다시 확인해주세요.',
}: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl bg-surface px-6 py-18 text-center">
        <p className="text-lg font-bold">{emptyTitle}</p>
        <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-250 border-collapse text-left text-sm">
            <thead className="bg-surface-hover text-xs font-bold text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-4">업체명</th>
                <th scope="col" className="px-5 py-4">제품명</th>
                <th scope="col" className="px-5 py-4">식품유형</th>
                <th scope="col" className="px-5 py-4 text-right">에탄올 함량(%)</th>
                <th scope="col" className="px-5 py-4 text-right">수량</th>
                <th scope="col" className="px-5 py-4">위치</th>
                <th scope="col" className="px-5 py-4">수령일</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-border hover:bg-surface-hover">
                  <td className="px-5 py-4 text-muted-foreground">{product.companyName}</td>
                  <th scope="row" className="px-5 py-4">
                    <button
                      type="button"
                      className="rounded text-left font-bold text-foreground hover:text-primary hover:underline focus-visible:outline-3 focus-visible:outline-primary"
                      onClick={() => onSelectProduct(product.id)}
                    >
                      <span>{product.productName}</span>
                      {newProductIds.has(product.id) ? (
                        <span className="ml-2 inline-flex rounded-full bg-success-soft px-2 py-0.5 text-xs font-bold text-success">
                          신규
                        </span>
                      ) : null}
                    </button>
                  </th>
                  <td className="px-5 py-4 text-muted-foreground">{product.foodType}</td>
                  <td className="px-5 py-4 text-right tabular-nums">
                    {formatEthanolPercent(product.ethanolPercent)}
                  </td>
                  <td className="px-5 py-4 text-right text-base font-extrabold tabular-nums">
                    {product.quantity.toLocaleString('ko-KR')}
                  </td>
                  <td className="px-5 py-4">
                    <span className={product.location ? 'font-semibold' : 'font-semibold text-danger'}>
                      {product.location ?? '미지정'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground tabular-nums">{product.receivedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            aria-label={`${product.companyName} ${product.productName} 상세 보기`}
            className="block min-h-30 w-full rounded-2xl border border-border bg-surface p-5 text-left focus-visible:outline-3 focus-visible:outline-primary"
            onClick={() => onSelectProduct(product.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-muted-foreground">{product.companyName}</p>
                <p className="mt-1 flex items-center gap-2 truncate text-lg font-extrabold">
                  <span className="truncate">{product.productName}</span>
                  {newProductIds.has(product.id) ? (
                    <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-xs font-bold text-success">
                      신규
                    </span>
                  ) : null}
                </p>
              </div>
              <ChevronRight aria-hidden="true" className="mt-3 shrink-0 text-muted-foreground" />
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <p className={`flex items-center gap-1.5 text-sm font-semibold ${product.location ? '' : 'text-danger'}`}>
                <MapPin aria-hidden="true" size={16} />
                {product.location ?? '위치 미지정'}
              </p>
              <p className="text-right">
                <span className="text-xs text-muted-foreground">수량 </span>
                <span className="text-xl font-extrabold tabular-nums">{product.quantity}</span>
              </p>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
