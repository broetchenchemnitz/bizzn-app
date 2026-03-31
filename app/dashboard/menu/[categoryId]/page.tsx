import { getCategory, getDishes, deleteDish } from '@/app/lib/actions/dishActions';
import { TrashIcon } from '@heroicons/react/24/outline';
import DishForm from './DishForm';

export default async function CategoryPage({ params }: { params: { categoryId: string } }) {
  const category = await getCategory(params.categoryId);
  const dishes = await getDishes(params.categoryId);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-gray-700 pb-4">
          <h1 className="text-3xl font-bold text-white">{category?.name || 'Kategorie Details'}</h1>
          <p className="text-gray-400 mt-1">Verwalte die Speisen für diese Kategorie.</p>
        </header>

        <section className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">Neue Speise anlegen</h2>
          <DishForm categoryId={params.categoryId} />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-white">Aktuelle Speisen</h2>
          {dishes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/50">
              <p className="text-gray-400 text-lg">Noch keine Speisen angelegt</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {dishes.map((dish) => (
                <div key={dish.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5 flex justify-between items-start hover:border-[#77CC00] transition-colors">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">{dish.name}</h3>
                      {dish.isActive && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-[#77CC00]/20 text-[#77CC00] rounded-full border border-[#77CC00]/30">
                          Aktiv
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{dish.description}</p>
                    <p className="text-[#77CC00] font-medium mt-2">{dish.price.toFixed(2)} €</p>
                  </div>
                  <form action={deleteDish.bind(null, dish.id)}>
                    <button type="submit" className="text-gray-500 hover:text-red-500 transition-colors p-2">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
