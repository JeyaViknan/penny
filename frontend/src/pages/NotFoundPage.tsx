import { PageLayout } from '../components/layout/PageLayout'
import { ButtonLink } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <PageLayout title="That page does not exist" width="measure">
      <p className="t-body text-ink-2">
        The link may be out of date, or the record may have been removed. Everything else is still
        where you left it.
      </p>
      <div className="mt-5">
        <ButtonLink variant="primary" to="/">
          Back to overview
        </ButtonLink>
      </div>
    </PageLayout>
  )
}
