import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Surface'

export function NotFoundPage() {
  return (
    <div className="px-4 sm:px-0">
      <div className="list-group">
        <EmptyState
          title="That page does not exist"
          description="The link may be out of date, or the record may have been removed. Everything else is still where you left it."
          action={
            <Button variant="filled" asLink="/">
              Back to overview
            </Button>
          }
        />
      </div>
    </div>
  )
}
