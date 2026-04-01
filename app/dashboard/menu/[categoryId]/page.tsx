import { getCategory, getDishes, deleteDish } from '@/app/lib/actions/dishActions';
import { TrashIcon } from '@heroicons/react/24/outline';
import DishForm from './DishForm';

export default async function CategoryPage({ params }: { params: { categoryId: string } }) {
  const category = await getCategory(params.categoryId);
  const dishes = await getDishes(params.categoryId);

  return (
    <div className="p-6 w-full max-w-4xl mx-auto space-y-8">
      <header className="border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-white">{category?.name || 'Kategorie Details'}</h1>
        <p className="text-gray-400 mt-1">Verwalte die Speisen für diese Kategorie.</p>
      </header>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl">
        <h2 className="text-xl font-semibold mb-6 text-white">Neue Speise anlegen</h2>
        <DishForm categoryId={params.categoryId} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-white">Aktuelle Speisen</h2>
        {dishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-gray-700 rounded-xl bg-gray-900/50">
            <p className="text-gray-400 text-lg">Noch keine Speisen angelegt</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {dishes.map((dish) => (
              <div key={dish.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex justify-between items-start hover:border-[#C7A17A] hover:shadow-[0_0_15px_rgba(119,204,0,0.1)] transition-all duration-300 group">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white group-hover:text-[#C7A17A] transition-colors">{dish.name}</h3>
                    {dish.isActive && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-[#C7A17A]/10 text-[#C7A17A] rounded-full border border-[#C7A17A]/20">
                        Aktiv
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{dish.description}</p>
                  <p className="text-[#C7A17A] font-medium mt-3">{dish.price.toFixed(2)} €</p>
                </div>
                <form action={deleteDish.bind(null, dish.id)}>
                  <button type="submit" className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all p-2">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
