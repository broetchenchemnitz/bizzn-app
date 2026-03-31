"use client";
import { useState, useEffect } from "react";
import { getBrowserClient } from "@/lib/supabase"; // Korrektur: @supabase/ssr statt auth-helpers-nextjs

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category_id: string;
  restaurant_id: string;
  is_available: boolean;
};

type Category = {
  id: string;
  name: string;
  restaurant_id: string;
};

export default function MenuManager() {
  const supabase = getBrowserClient();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    setLoading(true);
    // Eigenes Restaurant des eingeloggten Gastronomen ermitteln
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .single();

    if (restaurant) {
      setRestaurantId(restaurant.id);
      await Promise.all([
        fetchItems(restaurant.id),
        fetchCategories(restaurant.id),
      ]);
    }
    setLoading(false);
  };

  const fetchItems = async (rid: string) => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", rid)
      .order("name", { ascending: true });
    if (data) setItems(data);
  };

  const fetchCategories = async (rid: string) => {
    const { data } = await supabase
      .from("categories")
      .select("id, name, restaurant_id")
      .eq("restaurant_id", rid)
      .order("sort_order", { ascending: true });
    if (data) {
      setCategories(data);
      if (data.length > 0) setCategoryId(data[0].id);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !categoryId) return;

    const { error } = await supabase.from("menu_items").insert([
      {
        name,
        price: parseFloat(price),
        category_id: categoryId,   // Pflichtfeld: FK zu categories
        restaurant_id: restaurantId, // Pflichtfeld: denormalisiert für RLS
      },
    ]);

    if (!error) {
      setName("");
      setPrice("");
      fetchItems(restaurantId);
    } else {
      console.error("Insert failed:", error);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (!error && restaurantId) fetchItems(restaurantId);
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-white flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Lade Speisekarte…</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-slate-100 font-sans selection:bg-lime-500/30">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <header className="mb-10 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-500 mb-3">
            Speisekarten-Management
          </h1>
          <p className="text-slate-400 text-lg">Verwalte deine Gerichte und Preise mit Stil und Präzision.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Formular-Bereich */}
          <div className="lg:col-span-5">
            <form onSubmit={handleAdd} className="p-6 sm:p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl">
              <h2 className="text-xl font-semibold mb-6 text-slate-200">Neues Gericht</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Gericht Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-inner" placeholder="z.B. Trüffel-Pasta" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Preis (€)</label>
                  <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-inner" placeholder="0.00" required />
                </div>
                <button type="submit" className="w-full py-3.5 mt-4 bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-400 hover:to-emerald-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-lime-500/20 hover:shadow-lime-500/40 transition-all duration-300 active:scale-[0.98]">
                  Gericht hinzufügen
                </button>
              </div>
            </form>
          </div>

          {/* Listen-Bereich */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl h-full flex flex-col">
              <h2 className="text-xl font-semibold mb-6 text-slate-200 flex items-center justify-between border-b border-slate-800/50 pb-4">
                Aktuelle Gerichte
                <span className="text-xs font-bold text-slate-300 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">{items.length} Einträge</span>
              </h2>

              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
                  <p className="text-slate-500 text-center">Keine Gerichte vorhanden.<br/>Zeit, die Karte zu füllen!</p>
                </div>
              ) : (
                <ul className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                  {items.map((item) => (
                    <li key={item.id} className="group flex justify-between items-center bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60 hover:border-lime-500/40 hover:bg-slate-800/40 transition-all duration-300 shadow-sm hover:shadow-md">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200 group-hover:text-lime-400 transition-colors text-lg">{item.name}</span>
                        <span className="text-slate-400 text-sm font-medium">{Number(item.price).toFixed(2)} €</span>
                      </div>
                      <button onClick={() => handleDelete(item.id)} className="opacity-100 lg:opacity-0 group-hover:opacity-100 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 hover:text-rose-400 text-sm font-bold rounded-xl transition-all duration-300 border border-transparent hover:border-rose-500/30 active:scale-95">
                        Löschen
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

