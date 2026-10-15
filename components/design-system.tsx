'use client'

import { useState } from 'react'
import { Blocks, Download, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Stepper } from '@/components/ui/stepper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Hint } from '@/components/ui/tooltip'
import type { Dictionary } from '@/lib/i18n/ru'

const SWATCHES = ['bg', 'surface', 'surface-2', 'outline', 'text', 'text-2', 'text-3', 'accent', 'link', 'success', 'danger-text', 'warn-text'] as const
const BLOCKS = ['events', 'move', 'motor', 'light', 'sound', 'control', 'sensors'] as const

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4">
      <h2 className="m-0 font-display text-2xl font-extrabold">{title}</h2>
      {children}
    </section>
  )
}

/** Living style guide: every token and component in the current theme. */
export function DesignSystem({ t }: { t: Dictionary['design'] }) {
  const [step, setStep] = useState(1)
  return (
    <div className="container grid gap-12 py-8 pb-16">
      <header className="grid gap-2">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="m-0 text-(length:--text-4xl)">{t.title}</h1>
        <p className="lead">{t.lead}</p>
      </header>

      <Section title={t.colors}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {SWATCHES.map((name) => (
            <div key={name} className="grid gap-1.5 text-sm font-bold">
              <span className="h-14 rounded-(--radius-sm) border-(length:--stroke-thin) border-outline" style={{ background: `var(--${name})` }} />
              <code className="font-mono text-xs text-muted-foreground">--{name}</code>
            </div>
          ))}
        </div>
        <h3 className="m-0 font-display text-lg">{t.blocks}</h3>
        <div className="flex flex-wrap gap-2">
          {BLOCKS.map((b) => (
            <span key={b} className="rounded-(--radius-xs) px-3 py-2 text-sm font-extrabold text-(--blk-text)" style={{ background: `var(--blk-${b})` }}>
              {t.blockNames[b]}
            </span>
          ))}
        </div>
      </Section>

      <Section title={t.type}>
        <Card flat>
          <p className="m-0 font-display text-(length:--text-3xl) leading-tight font-extrabold">{t.typeSample}</p>
          <p className="m-0 font-display text-xl font-bold">{t.typeSample}</p>
          <p className="m-0 text-base">{t.bodySample}</p>
          <code className="font-mono text-sm">move(30, unit=&quot;cm&quot;) · әқғұ</code>
        </Card>
      </Section>

      <Section title={t.buttons}>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg">
            <Sparkles aria-hidden="true" />
            {t.primary}
          </Button>
          <Button variant="primary">{t.primary}</Button>
          <Button>{t.secondary}</Button>
          <Button variant="ghost">{t.ghost}</Button>
          <Button variant="danger" size="sm">
            <Trash2 aria-hidden="true" />
            {t.danger}
          </Button>
          <Button disabled>{t.disabled}</Button>
          <Hint label={t.hint}>
            <Button size="icon" aria-label={t.hint}>
              <Download aria-hidden="true" />
            </Button>
          </Hint>
        </div>
      </Section>

      <Section title={t.cards}>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t.cardTitle}</CardTitle>
              <Badge>
                <Blocks aria-hidden="true" />5
              </Badge>
            </CardHeader>
            <CardDescription>{t.cardText}</CardDescription>
            <CardFooter>
              <Button variant="primary" size="sm">
                <Download aria-hidden="true" />
                .llsp3
              </Button>
              <Button size="sm">Python</Button>
            </CardFooter>
          </Card>
          <Card flat>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge>default</Badge>
                <Badge variant="outline">outline</Badge>
                <Badge variant="primary">primary</Badge>
                <Badge variant="success">success</Badge>
                <Badge variant="warn">warn</Badge>
                <Badge variant="danger">danger</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title={t.tabs}>
        <Tabs defaultValue="blocks">
          <TabsList aria-label={t.tabs}>
            <TabsTrigger value="blocks">{t.tabBlocks}</TabsTrigger>
            <TabsTrigger value="python">{t.tabPython}</TabsTrigger>
          </TabsList>
          <TabsContent value="blocks">
            <p className="m-0">{t.tabBlocksText}</p>
          </TabsContent>
          <TabsContent value="python">
            <p className="m-0">{t.tabPythonText}</p>
          </TabsContent>
        </Tabs>
      </Section>

      <Section title={t.overlays}>
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button>{t.openDialog}</Button>
            </DialogTrigger>
            <DialogContent closeLabel={t.close}>
              <DialogHeader>
                <DialogTitle>{t.dialogTitle}</DialogTitle>
                <DialogDescription>{t.dialogText}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">{t.cancel}</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="primary">{t.confirm}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => toast.success(t.toastText)}>{t.showToast}</Button>
        </div>
      </Section>

      <div className="grid gap-12 md:grid-cols-2">
        <Section title={t.loading}>
          <div className="grid gap-2">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-8 w-5/6" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        </Section>
        <Section title={t.stepper}>
          <Stepper label={t.stepper} current={step} onSelect={setStep} steps={t.steps.map((title) => ({ title }))} />
        </Section>
      </div>

      <Section title={t.empty}>
        <EmptyState icon={<Sparkles aria-hidden="true" />} title={t.emptyTitle} description={t.emptyText}>
          <Button variant="primary">{t.primary}</Button>
        </EmptyState>
      </Section>
    </div>
  )
}
