import { getCategory, getDishes, deleteDish } from '@/app/lib/actions/dishActions';
import { TrashIcon } from '@heroicons/react/24/outline';
import DishForm from './DishForm';

export default async function CategoryPage({ params }: { params: { categoryId: string } }) {
  const category = await getCategory(params.categoryId);
  const dishes = await getDishes(params.categoryId);

  return (
    <div className="p-6 w-full max-w-4xl mx-auto space-y-8">
      <header className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-bold text-white">{category?.name || 'Kategorie Details'}</h1>
        <p className="text-white/45 mt-1">Verwalte die Speisen für diese Kategorie.</p>
      </header>

      <section className="card p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">Neue Speise anlegen</h2>
        <DishForm categoryId={params.categoryId} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4 text-white">Aktuelle Speisen</h2>
        {dishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/20 rounded-xl bg-[#242424]/50">
            <p className="text-white/45 text-lg">Noch keine Speisen angelegt</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {dishes.map((dish) => (
              <div key={dish.id} className="card p-5 flex justify-between items-start hover:border-[#77CC00]/50 transition-colors">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">{dish.name}</h3>
                    {dish.isActive && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-[#77CC00]/10 text-[#77CC00] rounded-full border border-[#77CC00]/20">
                        Aktiv
                      </span>
                    )}
                  </div>
                  <p className="text-white/45 text-sm mt-1">{dish.description}</p>
                  <p className="text-[#77CC00] font-medium mt-2">{dish.price.toFixed(2)} €</p>
                </div>
                <form action={deleteDish.bind(null, dish.id)}>
                  <button type="submit" className="text-white/45 hover:text-red-500 transition-colors p-2">
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
