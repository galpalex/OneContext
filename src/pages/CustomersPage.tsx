import { useCallback, useEffect, useMemo, useState } from 'react'
import { listCustomers } from '../data/customers'
import { describeError, isSupabaseConfigured, supabaseConfigError } from '../lib/supabase'
import type { Customer } from '../lib/types'
import { CustomerFilters } from '../components/customers/CustomerFilters'
import { CustomerTable } from '../components/customers/CustomerTable'
import { CreateCustomerForm } from '../components/customers/CreateCustomerForm'
import { EmptyState } from '../components/states/EmptyState'
import { ErrorState } from '../components/states/ErrorState'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'

type LoadState = 'loading' | 'ready' | 'error'

function matchesSearch(customer: Customer, query: string): boolean {
  if (query.length === 0) return true
  const needle = query.toLowerCase()

  return [customer.name, customer.email, customer.phone, customer.company]
    .filter((field): field is string => typeof field === 'string')
    .some((field) => field.toLowerCase().includes(needle))
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setState('error')
      setError(supabaseConfigError)
      return
    }

    setState('loading')
    setError(null)

    try {
      setCustomers(await listCustomers())
      setState('ready')
    } catch (caught) {
      setError(describeError(caught))
      setState('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(
    () =>
      customers.filter(
        (customer) =>
          matchesSearch(customer, search.trim()) &&
          (stage === 'all' || customer.lifecycle_stage === stage),
      ),
    [customers, search, stage],
  )

  const hasCustomers = customers.length > 0
  const filtersActive = search.trim().length > 0 || stage !== 'all'

  return (
    <div className="oc-page">
      <header className="oc-page__header">
        <div className="oc-page__title-group">
          <h1>Customers</h1>
          <p className="oc-page__subtitle">
            Every customer you own. Open one to see its full interaction context.
          </p>
        </div>
        <div className="oc-page__actions">
          <Button
            variant="primary"
            onClick={() => setFormOpen(true)}
            disabled={!isSupabaseConfigured}
            iconLeft={<Icon name="plus" />}
          >
            Create customer
          </Button>
        </div>
      </header>

      {successMessage ? (
        <div className="oc-banner oc-banner--positive" role="status">
          <Icon name="check" size={18} />
          <div>
            <p className="oc-banner__title">Customer created</p>
            <p>{successMessage}</p>
          </div>
        </div>
      ) : null}

      <Card>
        {state === 'error' ? (
          <CardBody>
            <ErrorState
              title="Customers could not be loaded"
              message={error ?? 'Unknown error.'}
              onRetry={isSupabaseConfigured ? () => void load() : undefined}
              inline
            />
          </CardBody>
        ) : state === 'loading' ? (
          <CardBody padding="flush">
            <p className="oc-visually-hidden" role="status">
              Loading customers…
            </p>
            <CustomerTable customers={[]} loading />
          </CardBody>
        ) : !hasCustomers ? (
          <CardBody>
            <EmptyState
              title="No customers yet"
              body={
                <>
                  OneContext turns scattered conversations into one customer history. Create your
                  first customer, then every web request, WhatsApp message, email and phone note you
                  log will build a single timeline you can act on.
                </>
              }
              actions={
                <Button
                  variant="primary"
                  onClick={() => setFormOpen(true)}
                  iconLeft={<Icon name="plus" />}
                >
                  Create customer
                </Button>
              }
            />
          </CardBody>
        ) : (
          <>
            <CustomerFilters
              search={search}
              onSearchChange={setSearch}
              stage={stage}
              onStageChange={setStage}
              shown={visible.length}
              total={customers.length}
            />
            {visible.length === 0 ? (
              <CardBody>
                <EmptyState
                  icon="search"
                  title="No customers match these filters"
                  body="Adjust the search text or lifecycle stage filter to widen the result set."
                  actions={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch('')
                        setStage('all')
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                  inline
                />
              </CardBody>
            ) : (
              <CardBody padding="flush">
                <CustomerTable customers={visible} />
              </CardBody>
            )}
          </>
        )}
      </Card>

      {hasCustomers && state === 'ready' && !filtersActive ? (
        <p className="oc-meta">
          Last interaction, channels and open follow-ups stay empty until channel events exist -
          OneContext shows no metric it cannot derive from stored records.
        </p>
      ) : null}

      {formOpen ? (
        <CreateCustomerForm
          onClose={() => setFormOpen(false)}
          onCreated={(customer) => {
            setCustomers((current) => [customer, ...current])
            setFormOpen(false)
            setSearch('')
            setStage('all')
            setSuccessMessage(`${customer.name} was added to your customer list.`)
          }}
        />
      ) : null}
    </div>
  )
}
