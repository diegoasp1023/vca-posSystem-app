import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { fetchAdminMenuCategories } from '../../lib/adminApi'
import type { MenuCategory } from '../../lib/api'
import { BackToPanelLink } from './BackToPanelLink'
import { MenuCategoriesTab } from './MenuCategoriesTab'
import { MenuItemsTab } from './MenuItemsTab'

type Tab = 'items' | 'categories'

export function AdminMenuPage() {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const [tab, setTab] = useState<Tab>('items')
  const [categories, setCategories] = useState<MenuCategory[]>([])

  const reloadCategories = useCallback(() => {
    getToken().then(fetchAdminMenuCategories).then(setCategories)
  }, [getToken])

  useEffect(reloadCategories, [reloadCategories])

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <BackToPanelLink />

        <h1 className="mt-4 font-serif text-3xl text-lavender-dark">{t('adminMenu.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('adminMenu.description')}</p>

        <div className="mt-6 flex flex-wrap gap-2 border-b border-cream">
          <TabButton active={tab === 'items'} onClick={() => setTab('items')}>
            {t('adminMenu.itemsTab')}
          </TabButton>
          <TabButton active={tab === 'categories'} onClick={() => setTab('categories')}>
            {t('adminMenu.categoriesTab')}
          </TabButton>
        </div>

        {tab === 'items' && <MenuItemsTab categories={categories} />}
        {tab === 'categories' && (
          <MenuCategoriesTab categories={categories} onCategoriesChange={reloadCategories} />
        )}
      </div>
    </section>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'border-coral text-coral-dark'
          : 'border-transparent text-gray-500 hover:text-lavender-dark'
      }`}
    >
      {children}
    </button>
  )
}
