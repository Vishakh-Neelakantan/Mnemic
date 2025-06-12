"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Brain, Calendar, Clock, Target, TrendingUp, BookOpen, Plus, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PredictionRequest {
  difficulty: string
  subject: string
  response_time: number
  previous_attempts: number
  success_rate: number
  days_since_last_review: number
  study_streak: number
  current_accuracy: number
  ease_factor?: number
}

interface StudyItem extends PredictionRequest {
  item_id: string
}

interface PredictionResult {
  optimal_interval_days: number
  next_review_date: string
  success: boolean
}

interface ScheduleItem {
  item_id: string
  subject: string
  difficulty: string
  next_review_date: string
  days_until_review: number
  priority: number
  success_rate: number
}

export default function SpacedRepetitionApp() {
  const [apiUrl, setApiUrl] = useState("http://127.0.0.1:8000")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Single prediction state
  const [singleItem, setSingleItem] = useState<PredictionRequest>({
    difficulty: "",
    subject: "",
    response_time: 0,
    previous_attempts: 0,
    success_rate: 0,
    days_since_last_review: 0,
    study_streak: 0,
    current_accuracy: 0,
    ease_factor: 2.5,
  })
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null)

  // Multiple items state
  const [studyItems, setStudyItems] = useState<StudyItem[]>([])
  const [scheduleResult, setScheduleResult] = useState<ScheduleItem[]>([])
  const [daysAhead, setDaysAhead] = useState(30)

  const difficulties = ["easy", "medium", "hard"]
  const subjects = ["math", "science", "language", "history", "art"]

  const handleSinglePrediction = async () => {
    if (!singleItem.difficulty || !singleItem.subject) {
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`${apiUrl}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(singleItem),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setPredictionResult(result)
    } catch (err) {
      setError(`Failed to get prediction: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleGeneration = async () => {
    if (studyItems.length === 0) {
      setError("Please add at least one study item")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`${apiUrl}/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: studyItems,
          days_ahead: daysAhead,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setScheduleResult(result.schedule)
    } catch (err) {
      setError(`Failed to generate schedule: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const addStudyItem = () => {
    const newItem: StudyItem = {
      item_id: `item_${Date.now()}`,
      difficulty: "medium",
      subject: "math",
      response_time: 0,
      previous_attempts: 0,
      success_rate: 0,
      days_since_last_review: 0,
      study_streak: 0,
      current_accuracy: 0,
      ease_factor: 2.5,
    }
    setStudyItems([...studyItems, newItem])
  }

  const removeStudyItem = (index: number) => {
    setStudyItems(studyItems.filter((_, i) => i !== index))
  }

  const updateStudyItem = (index: number, field: keyof StudyItem, value: any) => {
    const updated = [...studyItems]
    updated[index] = { ...updated[index], [field]: value }
    setStudyItems(updated)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "hard":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority < 3) return "bg-red-100 text-red-800"
    if (priority < 7) return "bg-yellow-100 text-yellow-800"
    return "bg-green-100 text-green-800"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Spaced Repetition AI</h1>
          </div>
          <p className="text-gray-600">Optimize your learning with ML-powered study scheduling</p>
        </div>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="API URL (e.g., http://localhost:8000)"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={() => setApiUrl("http://localhost:8000")}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="single" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Single Prediction
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Study Schedule
            </TabsTrigger>
          </TabsList>

          {/* Single Prediction Tab */}
          <TabsContent value="single" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Study Item Details</CardTitle>
                <CardDescription>
                  Enter the details of your study item to get an optimal review interval prediction
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty *</Label>
                    <Select
                      value={singleItem.difficulty}
                      onValueChange={(value) => setSingleItem({ ...singleItem, difficulty: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        {difficulties.map((diff) => (
                          <SelectItem key={diff} value={diff}>
                            {diff.charAt(0).toUpperCase() + diff.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Select
                      value={singleItem.subject}
                      onValueChange={(value) => setSingleItem({ ...singleItem, subject: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subj) => (
                          <SelectItem key={subj} value={subj}>
                            {subj.charAt(0).toUpperCase() + subj.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="response_time">Response Time (seconds)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={singleItem.response_time}
                      onChange={(e) =>
                        setSingleItem({ ...singleItem, response_time: Number.parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="previous_attempts">Previous Attempts</Label>
                    <Input
                      type="number"
                      value={singleItem.previous_attempts}
                      onChange={(e) =>
                        setSingleItem({ ...singleItem, previous_attempts: Number.parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="success_rate">Success Rate (0-1)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={singleItem.success_rate}
                      onChange={(e) =>
                        setSingleItem({ ...singleItem, success_rate: Number.parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="days_since_last_review">Days Since Last Review</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={singleItem.days_since_last_review}
                      onChange={(e) =>
                        setSingleItem({ ...singleItem, days_since_last_review: Number.parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="study_streak">Study Streak (days)</Label>
                    <Input
                      type="number"
                      value={singleItem.study_streak}
                      onChange={(e) =>
                        setSingleItem({ ...singleItem, study_streak: Number.parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_accuracy">Current Accuracy (0-1)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={singleItem.current_accuracy}
                      onChange={(e) =>
                        setSingleItem({ ...singleItem, current_accuracy: Number.parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ease_factor">Ease Factor (optional)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1.3"
                      max="2.5"
                      value={singleItem.ease_factor}
                      onChange={(e) =>
                        setSingleItem({ ...singleItem, ease_factor: Number.parseFloat(e.target.value) || 2.5 })
                      }
                    />
                  </div>
                </div>

                <Button onClick={handleSinglePrediction} disabled={loading} className="w-full">
                  {loading ? "Predicting..." : "Get Prediction"}
                </Button>
              </CardContent>
            </Card>

            {/* Single Prediction Result */}
            {predictionResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Prediction Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {predictionResult.optimal_interval_days} days
                      </div>
                      <div className="text-sm text-gray-600">Optimal Interval</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{predictionResult.next_review_date}</div>
                      <div className="text-sm text-gray-600">Next Review Date</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Study Items</span>
                  <Button onClick={addStudyItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardTitle>
                <CardDescription>Add multiple study items to generate an optimized study schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="days_ahead">Schedule Days Ahead</Label>
                  <Input
                    type="number"
                    value={daysAhead}
                    onChange={(e) => setDaysAhead(Number.parseInt(e.target.value) || 30)}
                    className="w-32"
                  />
                </div>

                {studyItems.map((item, index) => (
                  <Card key={item.item_id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      <Button variant="outline" size="sm" onClick={() => removeStudyItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Item ID</Label>
                        <Input
                          value={item.item_id}
                          onChange={(e) => updateStudyItem(index, "item_id", e.target.value)}
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Difficulty</Label>
                        <Select
                          value={item.difficulty}
                          onValueChange={(value) => updateStudyItem(index, "difficulty", value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {difficulties.map((diff) => (
                              <SelectItem key={diff} value={diff}>
                                {diff}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Subject</Label>
                        <Select
                          value={item.subject}
                          onValueChange={(value) => updateStudyItem(index, "subject", value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((subj) => (
                              <SelectItem key={subj} value={subj}>
                                {subj}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Response Time</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={item.response_time}
                          onChange={(e) =>
                            updateStudyItem(index, "response_time", Number.parseFloat(e.target.value) || 0)
                          }
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Previous Attempts</Label>
                        <Input
                          type="number"
                          value={item.previous_attempts}
                          onChange={(e) =>
                            updateStudyItem(index, "previous_attempts", Number.parseInt(e.target.value) || 0)
                          }
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Success Rate</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={item.success_rate}
                          onChange={(e) =>
                            updateStudyItem(index, "success_rate", Number.parseFloat(e.target.value) || 0)
                          }
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Days Since Review</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={item.days_since_last_review}
                          onChange={(e) =>
                            updateStudyItem(index, "days_since_last_review", Number.parseFloat(e.target.value) || 0)
                          }
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Study Streak</Label>
                        <Input
                          type="number"
                          value={item.study_streak}
                          onChange={(e) => updateStudyItem(index, "study_streak", Number.parseInt(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Current Accuracy</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={item.current_accuracy}
                          onChange={(e) =>
                            updateStudyItem(index, "current_accuracy", Number.parseFloat(e.target.value) || 0)
                          }
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Ease Factor</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="1.3"
                          max="2.5"
                          value={item.ease_factor}
                          onChange={(e) =>
                            updateStudyItem(index, "ease_factor", Number.parseFloat(e.target.value) || 2.5)
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                  </Card>
                ))}

                <Button
                  onClick={handleScheduleGeneration}
                  disabled={loading || studyItems.length === 0}
                  className="w-full"
                >
                  {loading ? "Generating Schedule..." : "Generate Study Schedule"}
                </Button>
              </CardContent>
            </Card>

            {/* Schedule Results */}
            {scheduleResult.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Study Schedule ({scheduleResult.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scheduleResult.map((item, index) => (
                      <div key={item.item_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">#{index + 1}</div>
                          <div>
                            <div className="font-medium">{item.item_id}</div>
                            <div className="text-sm text-gray-600">{item.subject}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={getDifficultyColor(item.difficulty)}>{item.difficulty}</Badge>
                          <Badge className={getPriorityColor(item.priority)}>
                            Priority: {item.priority.toFixed(1)}
                          </Badge>
                          <div className="text-right">
                            <div className="text-sm font-medium">{item.next_review_date}</div>
                            <div className="text-xs text-gray-600">
                              {item.days_until_review} days | {(item.success_rate * 100).toFixed(0)}% success
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
