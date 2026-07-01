import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { RequestAccessForm } from '@/components/access/RequestAccessForm'

// Fallback page for direct links (email/deck deep links). The primary flow
// is the modal — this page keeps working so external URLs don't 404.
export default function RequestAccessPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 flex items-start justify-center py-16 px-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6">
            <Suspense>
              <RequestAccessForm />
            </Suspense>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
