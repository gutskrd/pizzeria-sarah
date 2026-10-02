'use client';

/* eslint-disable @next/next/no-img-element -- admin thumbnails */
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  deleteMenuItem,
  removeMenuPdf,
  reorderCategories,
  reorderMenuItems,
  setCategoryVisible,
  setMenuItemFlags,
  updateCategory,
} from '@/app/admin/(panel)/menukaart/actions';
import { useConfirm } from '@/components/admin/confirm';
import { Dialog } from '@/components/admin/dialog';
import { EmptyState, Field, Toggle } from '@/components/admin/fields';
import { PageTitle } from '@/components/admin/page-title';
import { moveItem, SortableArea, useSortableItem } from '@/components/admin/sortable';
import { useToast } from '@/components/admin/toast';
import { uploadWithProgress } from '@/components/admin/upload';
import { useAdminAction } from '@/components/admin/use-admin-action';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  EditIcon,
  ExternalIcon,
  EyeIcon,
  EyeOffIcon,
  GripIcon,
  ListIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  UploadIcon,
} from '@/components/ui/icons';
import type { AdminMenuCategory, AdminMenuItem } from '@/lib/admin/types';
import { formatPrice } from '@/lib/format';
import { useCleanUrl } from '@/components/admin/use-clean-url';
import { MenuItemDialog } from './item-dialog';

type Pdf = { url: string; updatedAt: string; bytes: number } | null;

export function MenuEditor({ categories: initial, pdf, openItem }: { categories: AdminMenuCategory[]; pdf: Pdf; openItem?: string }) {
  const [categories, setCategories] = useState(initial);
  const [syncedFrom, setSyncedFrom] = useState(initial);
  const [sortingCategories, setSortingCategories] = useState(false);
  // Deep links from the command palette: ?gerecht=<id> or ?gerecht=nieuw
  const [categoryDialog, setCategoryDialog] = useState<{ category: AdminMenuCategory | null } | null>(() =>
    openItem === 'nieuw' && initial.length === 0 ? { category: null } : null,
  );
  const [itemDialog, setItemDialog] = useState<{ item: AdminMenuItem | null; categoryId: string } | null>(() => {
    if (!openItem) return null;
    if (openItem === 'nieuw') return initial[0] ? { item: null, categoryId: initial[0].id } : null;
    const item = initial.flatMap((c) => c.items).find((i) => i.id === openItem);
    return item ? { item, categoryId: item.categoryId } : null;
  });
  useCleanUrl(['gerecht']);
  const { run } = useAdminAction();

  if (initial !== syncedFrom) {
    setSyncedFrom(initial);
    setCategories(initial);
  }

  const itemCount = categories.reduce((n, c) => n + c.items.length, 0);

  const saveCategoryOrder = (next: AdminMenuCategory[]) => {
    setCategories(next);
    void run(() => reorderCategories({ ids: next.map((c) => c.id) }));
  };

  return (
    <>
      <PageTitle
        title="Menukaart"
        description={
          categories.length
            ? `${itemCount} ${itemCount === 1 ? 'gerecht' : 'gerechten'} in ${categories.length} ${categories.length === 1 ? 'categorie' : 'categorieën'}`
            : 'Hier beheer je de menukaart van de website.'
        }
        actions={
          sortingCategories ? (
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => setSortingCategories(false)}>
              Klaar
            </button>
          ) : (
            <>
              <a href="/menukaart" target="_blank" rel="noopener" className="admin-btn admin-btn-secondary">
                <ExternalIcon size={18} /> Voorbeeld bekijken
              </a>
              <button type="button" className="admin-btn admin-btn-primary" onClick={() => setCategoryDialog({ category: null })}>
                <PlusIcon size={18} /> Categorie
              </button>
            </>
          )
        }
      />

      {categories.length === 0 ? (
        <EmptyState icon={<ListIcon size={28} />} title="Nog geen menukaart">
          <p>Begin met een categorie, bijvoorbeeld voor pizza&apos;s of schotels. Daarna voeg je de gerechten met hun prijzen toe.</p>
          <button type="button" className="admin-btn admin-btn-primary mt-6" onClick={() => setCategoryDialog({ category: null })}>
            <PlusIcon size={18} /> Eerste categorie toevoegen
          </button>
        </EmptyState>
      ) : sortingCategories ? (
        <>
          <p className="mb-4 text-ink-soft">Sleep de categorieën in de gewenste volgorde, of gebruik de pijltjes. Wijzigingen worden direct opgeslagen.</p>
          <SortableArea items={categories} onReorder={saveCategoryOrder} layout="list" labelOf={(c) => c.name}>
            <ul className="space-y-2">
              {categories.map((c, i) => (
                <SortableRow
                  key={c.id}
                  id={c.id}
                  label={c.name}
                  index={i}
                  total={categories.length}
                  onMove={(d) => saveCategoryOrder(moveItem(categories, i, d))}
                >
                  <span className="font-semibold">{c.name}</span>
                  <span className="ml-2 text-sm text-muted">{c.items.length} gerechten</span>
                </SortableRow>
              ))}
            </ul>
          </SortableArea>
        </>
      ) : (
        <div className="space-y-4">
          {categories.length > 1 && (
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm -ml-2" onClick={() => setSortingCategories(true)}>
              <GripIcon size={18} /> Volgorde van categorieën aanpassen
            </button>
          )}
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={() => setCategoryDialog({ category })}
              onAddItem={() => setItemDialog({ item: null, categoryId: category.id })}
              onEditItem={(item) => setItemDialog({ item, categoryId: category.id })}
              onLocalReorder={(items) => setCategories((list) => list.map((c) => (c.id === category.id ? { ...c, items } : c)))}
            />
          ))}
        </div>
      )}

      <PdfCard pdf={pdf} />

      <CategoryDialog state={categoryDialog} onClose={() => setCategoryDialog(null)} />
      <MenuItemDialog
        open={itemDialog !== null}
        item={itemDialog?.item ?? null}
        categoryId={itemDialog?.categoryId ?? categories[0]?.id ?? ''}
        categories={categories}
        onClose={() => setItemDialog(null)}
      />
    </>
  );
}

function priceLabel(item: AdminMenuItem): string {
  if (item.priceCents !== null) return formatPrice(item.priceCents);
  if (item.variants.length) return item.variants.map((v) => `${v.label} ${formatPrice(v.priceCents)}`).join(' · ');
  return 'Geen prijs';
}

function CategoryCard({
  category,
  onEdit,
  onAddItem,
  onEditItem,
  onLocalReorder,
}: {
  category: AdminMenuCategory;
  onEdit: () => void;
  onAddItem: () => void;
  onEditItem: (item: AdminMenuItem) => void;
  onLocalReorder: (items: AdminMenuItem[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const [sorting, setSorting] = useState(false);
  const { run } = useAdminAction();
  const confirm = useConfirm();

  const saveOrder = (items: AdminMenuItem[]) => {
    onLocalReorder(items);
    void run(() => reorderMenuItems({ categoryId: category.id, ids: items.map((i) => i.id) }));
  };

  const remove = async () => {
    const count = category.items.length;
    const ok = await confirm({
      title: 'Categorie verwijderen?',
      tone: 'danger',
      confirmLabel: 'Verwijderen',
      message:
        count > 0 ? (
          <>
            <p>
              De categorie <strong>{category.name}</strong> bevat {count} {count === 1 ? 'gerecht' : 'gerechten'}. Die worden ook van de menukaart verwijderd.
            </p>
            <p className="mt-3 text-sm text-muted">Wil je de categorie alleen tijdelijk weghalen? Gebruik dan ‘Verbergen’.</p>
          </>
        ) : (
          <p>
            De categorie <strong>{category.name}</strong> wordt verwijderd.
          </p>
        ),
    });
    if (ok) await run(() => deleteCategory({ id: category.id }));
  };

  return (
    <section id={`categorie-${category.id}`} className="admin-card scroll-mt-28 overflow-hidden" aria-labelledby={`cat-${category.id}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-3 py-2.5 sm:px-4">
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={open}
          aria-controls={`items-${category.id}`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronUpIcon size={20} className="shrink-0 text-muted" /> : <ChevronDownIcon size={20} className="shrink-0 text-muted" />}
          <h2 id={`cat-${category.id}`} className="truncate font-display text-xl sm:text-2xl">
            {category.name}
          </h2>
          <span className="shrink-0 text-sm text-muted">({category.items.length})</span>
          {!category.isVisible && (
            <span className="admin-badge shrink-0 bg-paper text-ink-soft">
              <EyeOffIcon size={13} /> Verborgen
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onEdit}>
            <EditIcon size={17} /> Bewerken
          </button>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink"
            aria-label={category.isVisible ? `Categorie ${category.name} verbergen` : `Categorie ${category.name} zichtbaar maken`}
            title={category.isVisible ? 'Verbergen' : 'Zichtbaar maken'}
            onClick={() => run(() => setCategoryVisible({ id: category.id, isVisible: !category.isVisible }))}
          >
            {category.isVisible ? <EyeIcon size={19} /> : <EyeOffIcon size={19} />}
          </button>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-tomato-dark"
            aria-label={`Categorie ${category.name} verwijderen`}
            title="Verwijderen"
            onClick={remove}
          >
            <TrashIcon size={19} />
          </button>
        </div>
      </div>

      {open && (
        <div id={`items-${category.id}`}>
          {category.items.length === 0 ? (
            <p className="px-4 py-6 text-muted">Nog geen gerechten in deze categorie.</p>
          ) : sorting ? (
            <div className="p-3">
              <SortableArea items={category.items} onReorder={saveOrder} layout="list" labelOf={(i) => i.name}>
                <ul className="space-y-2">
                  {category.items.map((item, i) => (
                    <SortableRow
                      key={item.id}
                      id={item.id}
                      label={item.name}
                      index={i}
                      total={category.items.length}
                      onMove={(d) => saveOrder(moveItem(category.items, i, d))}
                    >
                      <span className="font-medium">{item.name}</span>
                    </SortableRow>
                  ))}
                </ul>
              </SortableArea>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {category.items.map((item) => (
                <ItemRow key={item.id} item={item} onEdit={() => onEditItem(item)} />
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 border-t border-line bg-paper/40 px-3 py-2.5 sm:px-4">
            {!sorting && (
              <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={onAddItem}>
                <PlusIcon size={16} /> Gerecht toevoegen
              </button>
            )}
            {category.items.length > 1 && (
              <button
                type="button"
                className={`admin-btn admin-btn-sm ${sorting ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
                onClick={() => setSorting((v) => !v)}
              >
                {sorting ? (
                  'Klaar'
                ) : (
                  <>
                    <GripIcon size={16} /> Volgorde aanpassen
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ItemRow({ item, onEdit }: { item: AdminMenuItem; onEdit: () => void }) {
  const { run } = useAdminAction();
  const confirm = useConfirm();
  return (
    <li className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 ${item.isVisible ? '' : 'bg-paper/50'}`}>
      <button type="button" onClick={onEdit} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left" aria-label={`${item.name} bewerken`}>
        {item.image ? <img src={item.image.thumbUrl} alt="" className="size-12 shrink-0 rounded-sm object-cover" /> : null}
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium ${item.isVisible ? '' : 'text-muted line-through decoration-1'}`}>
            {item.number && <span className="mr-1.5 text-muted">{item.number}</span>}
            {item.name}
          </span>
          <span className="block truncate text-sm text-muted tabular-nums">{priceLabel(item)}</span>
        </span>
        {item.isFeatured && (
          <span className="admin-badge hidden shrink-0 bg-crust/15 text-[#7a5016] sm:inline-flex">
            <StarIcon size={13} filled /> Uitgelicht
          </span>
        )}
        {!item.isVisible && <span className="admin-badge hidden shrink-0 bg-paper text-ink-soft sm:inline-flex">Verborgen</span>}
      </button>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          className={`inline-flex size-10 items-center justify-center rounded-md hover:bg-paper ${item.isFeatured ? 'text-crust' : 'text-muted'}`}
          aria-pressed={item.isFeatured}
          aria-label={item.isFeatured ? `${item.name} niet meer uitlichten` : `${item.name} uitlichten op de homepage`}
          title={item.isFeatured ? 'Uitgelicht' : 'Uitlichten'}
          onClick={() => run(() => setMenuItemFlags({ id: item.id, isFeatured: !item.isFeatured }))}
        >
          <StarIcon size={19} filled={item.isFeatured} />
        </button>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink"
          aria-label={item.isVisible ? `${item.name} verbergen` : `${item.name} zichtbaar maken`}
          title={item.isVisible ? 'Zichtbaar' : 'Verborgen'}
          onClick={() => run(() => setMenuItemFlags({ id: item.id, isVisible: !item.isVisible }))}
        >
          {item.isVisible ? <EyeIcon size={19} /> : <EyeOffIcon size={19} />}
        </button>
        <button
          type="button"
          className="hidden size-10 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-tomato-dark sm:inline-flex"
          aria-label={`${item.name} verwijderen`}
          title="Verwijderen"
          onClick={async () => {
            const ok = await confirm({
              title: 'Gerecht verwijderen?',
              message: (
                <p>
                  <strong>{item.name}</strong> wordt van de menukaart verwijderd.
                </p>
              ),
              confirmLabel: 'Verwijderen',
              tone: 'danger',
            });
            if (ok) await run(() => deleteMenuItem({ id: item.id }));
          }}
        >
          <TrashIcon size={19} />
        </button>
      </div>
    </li>
  );
}

function SortableRow({
  id,
  label,
  index,
  total,
  onMove,
  children,
}: {
  id: string;
  label: string;
  index: number;
  total: number;
  onMove: (d: -1 | 1) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, style, handleProps, isDragging } = useSortableItem(id);
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border bg-white p-1.5 ${isDragging ? 'border-tomato shadow-lg' : 'border-line'}`}
    >
      <span
        {...handleProps}
        className="inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted hover:bg-paper active:cursor-grabbing"
        aria-label={`${label} verslepen`}
      >
        <GripIcon size={20} />
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <button
        type="button"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        className="inline-flex size-11 items-center justify-center rounded-md hover:bg-paper disabled:opacity-30"
        aria-label={`${label} omhoog`}
      >
        <ChevronUpIcon size={20} />
      </button>
      <button
        type="button"
        disabled={index === total - 1}
        onClick={() => onMove(1)}
        className="inline-flex size-11 items-center justify-center rounded-md hover:bg-paper disabled:opacity-30"
        aria-label={`${label} omlaag`}
      >
        <ChevronDownIcon size={20} />
      </button>
    </li>
  );
}

function CategoryDialog({ state, onClose }: { state: { category: AdminMenuCategory | null } | null; onClose: () => void }) {
  if (!state) return null;
  return <CategoryForm key={state.category?.id ?? 'nieuw'} category={state.category} onClose={onClose} />;
}

function CategoryForm({ category, onClose }: { category: AdminMenuCategory | null; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [isVisible, setVisible] = useState(category?.isVisible ?? true);
  const [saving, setSaving] = useState(false);
  const { run, fieldErrors } = useAdminAction();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const input = { name, description, isVisible };
    const result = await run(() => (category ? updateCategory({ ...input, id: category.id }) : createCategory(input)));
    setSaving(false);
    if (result.ok) onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={category ? 'Categorie bewerken' : 'Categorie toevoegen'}
      footer={
        <>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
            Annuleren
          </button>
          <button type="submit" form="categorie-form" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? 'Bezig met opslaan…' : 'Opslaan'}
          </button>
        </>
      }
    >
      <form id="categorie-form" onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Naam" htmlFor="c-naam" error={fieldErrors.name}>
          <input
            id="c-naam"
            className="admin-input"
            value={name}
            maxLength={80}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!fieldErrors.name}
          />
        </Field>
        <Field
          label="Korte omschrijving"
          htmlFor="c-omschrijving"
          optional
          hint="Staat onder de naam van de categorie op de menukaart."
          error={fieldErrors.description}
        >
          <textarea id="c-omschrijving" className="admin-input" rows={2} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Toggle checked={isVisible} onChange={setVisible} label="Zichtbaar op de menukaart" />
      </form>
    </Dialog>
  );
}

function PdfCard({ pdf }: { pdf: Pdf }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const toast = useToast();
  const router = useRouter();
  const { run } = useAdminAction();
  const confirm = useConfirm();

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setProgress(0);
    const form = new FormData();
    form.set('file', file);
    const res = await uploadWithProgress<null>('/api/admin/menu-pdf', form, setProgress);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = '';
    if (res.ok) {
      toast.success(res.message ?? 'PDF-menukaart opgeslagen.');
      router.refresh();
    } else toast.error(res.error);
  };

  return (
    <section className="admin-card mt-8 p-5 sm:p-6" aria-labelledby="pdf-titel">
      <h2 id="pdf-titel" className="font-display text-2xl">
        Menukaart als PDF <span className="font-sans text-base font-normal text-muted">(optioneel)</span>
      </h2>
      <p className="mt-1 text-muted">Heb je de menukaart ook als PDF? Dan kunnen bezoekers die downloaden op de pagina Menukaart.</p>
      <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(e) => upload(e.target.files?.[0])} />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {pdf ? (
          <>
            <a href={pdf.url} target="_blank" rel="noopener" className="admin-btn admin-btn-secondary">
              <DownloadIcon size={18} /> PDF bekijken
            </a>
            <button type="button" className="admin-btn admin-btn-secondary" disabled={progress !== null} onClick={() => inputRef.current?.click()}>
              <UploadIcon size={18} /> {progress !== null ? `Bezig… ${Math.round(progress * 100)}%` : 'Vervangen'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              onClick={async () => {
                if (
                  await confirm({
                    title: 'PDF verwijderen?',
                    message: 'De PDF-menukaart is daarna niet meer te downloaden op de website.',
                    confirmLabel: 'Verwijderen',
                    tone: 'danger',
                  })
                )
                  await run(() => removeMenuPdf({}));
              }}
            >
              Verwijderen
            </button>
          </>
        ) : (
          <button type="button" className="admin-btn admin-btn-secondary" disabled={progress !== null} onClick={() => inputRef.current?.click()}>
            <UploadIcon size={18} /> {progress !== null ? `Bezig met uploaden… ${Math.round(progress * 100)}%` : 'PDF uploaden'}
          </button>
        )}
      </div>
      {pdf && (
        <p className="mt-3 text-sm text-muted">
          Bijgewerkt op {new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(pdf.updatedAt))}
        </p>
      )}
    </section>
  );
}
