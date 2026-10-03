interface Product {
  name: string;
  problemSolved: string;
  estimatedPrice: string;
  linkUrl: string;
  skuId: string;
  category: string;
}

const PRODUCT_MAP: Array<{ keywords: string[]; product: Product }> = [
  {
    keywords: ["watering"],
    product: {
      name: "Ceramic Watering Stakes (8\", 2-pack)",
      problemSolved: "Delivers water slowly and evenly to roots",
      estimatedPrice: "$12–16",
      linkUrl: "#",
      skuId: "SKU-01",
      category: "Watering",
    },
  },
  {
    keywords: ["overwatering", "drainage"],
    product: {
      name: "Fabric Grow Bags (5-gal, 5-pack)",
      problemSolved: "Improves drainage, prevents root rot",
      estimatedPrice: "$18–24",
      linkUrl: "#",
      skuId: "SKU-06",
      category: "Drainage",
    },
  },
  {
    keywords: ["moisture", "sensor"],
    product: {
      name: "XLUX Soil Moisture Meter",
      problemSolved: "Tells you exactly when to water",
      estimatedPrice: "$10–14",
      linkUrl: "#",
      skuId: "SKU-04",
      category: "Monitoring",
    },
  },
  {
    keywords: ["frost", "protection"],
    product: {
      name: "Pop-up Garden Cloche (4-pack)",
      problemSolved: "Protects plants from frost and cold snaps",
      estimatedPrice: "$22–28",
      linkUrl: "#",
      skuId: "SKU-02",
      category: "Protection",
    },
  },
  {
    keywords: ["timer", "irrigation"],
    product: {
      name: "Orbit 1-Outlet Mechanical Hose Timer",
      problemSolved: "Automates watering schedule",
      estimatedPrice: "$20–26",
      linkUrl: "#",
      skuId: "SKU-03",
      category: "Irrigation",
    },
  },
  {
    keywords: ["fertilizer", "nutrition"],
    product: {
      name: "Jobe's Fertilizer Spikes (30-pack)",
      problemSolved: "Delivers nutrients directly to roots",
      estimatedPrice: "$14–18",
      linkUrl: "#",
      skuId: "SKU-08",
      category: "Nutrition",
    },
  },
  {
    keywords: ["germination", "seedling"],
    product: {
      name: "Seedling Heat Mat (10\"x20\")",
      problemSolved: "Boosts germination and seedling growth",
      estimatedPrice: "$24–30",
      linkUrl: "#",
      skuId: "SKU-09",
      category: "Germination",
    },
  },
];

export function mapToolsToProducts(recommendedTools: string[]): Product[] {
  if (!recommendedTools || recommendedTools.length === 0) return [];

  const matched: Product[] = [];
  const seen = new Set<string>();

  for (const entry of PRODUCT_MAP) {
    if (matched.length >= 3) break;
    const matches = entry.keywords.some((kw) =>
      recommendedTools.some((t) => t.toLowerCase().includes(kw.toLowerCase()))
    );
    if (matches && !seen.has(entry.product.skuId)) {
      seen.add(entry.product.skuId);
      matched.push(entry.product);
    }
  }

  return matched;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          {product.category}
        </span>
        <span className="text-xs text-gray-400">{product.skuId}</span>
      </div>
      <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
      <p className="text-xs text-gray-600">{product.problemSolved}</p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm font-medium text-green-700">{product.estimatedPrice}</span>
        <a
          href={product.linkUrl}
          className="text-xs bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          View Product
        </a>
      </div>
    </div>
  );
}
