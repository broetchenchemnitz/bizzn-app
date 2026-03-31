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
    <div className="p-6 bg-gray-900 min-h-screen text-white font-sans">
      <h1 className="text-3xl font-bold mb-6 text-[#77CC00]">Speisekarten-Management</h1>

      {categories.length === 0 ? (
        <div className="mb-8 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg max-w-md">
          <p className="text-yellow-400 text-sm">
            ⚠️ Keine Kategorien vorhanden. Bitte zuerst eine Kategorie anlegen.
          </p>
        </div>
      ) : (
        <form onSubmit={handleAdd} className="mb-8 p-4 bg-gray-800 border border-gray-700 rounded-lg max-w-md">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Kategorie</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-[#77CC00]"
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Gericht Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-[#77CC00]"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Preis (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-[#77CC00]"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-[#77CC00] hover:bg-[#5fa300] text-black font-bold rounded transition-colors"
          >
            Gericht hinzufügen
          </button>
        </form>
      )}

      <div className="max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Aktuelle Gerichte</h2>
        {items.length === 0 ? (
          <p className="text-gray-400">Keine Gerichte vorhanden.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex justify-between items-center bg-gray-800 p-4 rounded border border-gray-700"
              >
                <div>
                  <span className="font-bold block">{item.name}</span>
                  <span className="text-[#77CC00]">{Number(item.price).toFixed(2)} €</span>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded transition-colors"
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
