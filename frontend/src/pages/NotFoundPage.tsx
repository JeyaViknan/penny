import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Surface'

export function NotFoundPage() {
  return (
    <EmptyState
      title="That page does not exist"
      description="The link may be out of date, or the record may have been removed. Everything else is still where you left it."
      action={<Button variant="primary" asLink="/">Back to overview</Button>}
    />
  )
}
