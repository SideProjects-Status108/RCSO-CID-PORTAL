'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function NewQuizForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('')
  const [green, setGreen] = useState(80)
  const [amber, setAmber] = useState(61)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const submit = () => {
    if (title.trim().length < 2) {
      setError('Title is required')
      return
    }
    if (amber >= green) {
      setError('Amber threshold must be below green threshold')
      return
    }
    setError(null)
    start(async () => {
      try {
        const res = await fetch('/api/training/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            topic: topic.trim() || null,
            pass_threshold_green: green,
            pass_threshold_amber: amber,
          }),
        })
        const j = (await res.json()) as { error?: string; quiz?: { id: string } }
        if (!res.ok || !j.quiz) throw new Error(j.error ?? 'Failed to create quiz')
        router.push(`/training/quizzes/${j.quiz.id}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create quiz')
      }
    })
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm text-text-primary">New quiz</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="quiz-title">Title</Label>
            <Input
              id="quiz-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Domestic Violence Basics"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quiz-topic">Topic (optional)</Label>
            <Input
              id="quiz-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Patrol procedures"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="quiz-desc">Description</Label>
          <Textarea
            id="quiz-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="quiz-green">Green threshold (%)</Label>
            <Input
              id="quiz-green"
              type="number"
              min={1}
              max={100}
              value={green}
              onChange={(e) => setGreen(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quiz-amber">Amber threshold (%)</Label>
            <Input
              id="quiz-amber"
              type="number"
              min={1}
              max={100}
              value={amber}
              onChange={(e) => setAmber(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div>
          <Button type="button" disabled={pending} onClick={submit}>
            {pending ? 'Creating…' : 'Create quiz'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
