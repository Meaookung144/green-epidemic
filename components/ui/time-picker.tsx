"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface TimePickerProps {
  time?: string
  onTimeChange?: (time: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  autoSetCurrent?: boolean
}

export function TimePicker({
  time,
  onTimeChange,
  placeholder = "Pick a time",
  disabled = false,
  className,
  autoSetCurrent = true
}: TimePickerProps) {
  const [selectedTime, setSelectedTime] = React.useState<string>(time || '')

  React.useEffect(() => {
    if (time) {
      setSelectedTime(time)
    } else if (autoSetCurrent) {
      // Auto set to current time
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      setSelectedTime(currentTime)
      onTimeChange?.(currentTime)
    }
  }, [time, onTimeChange, autoSetCurrent])

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = event.target.value
    setSelectedTime(newTime)
    onTimeChange?.(newTime)
  }

  const formatDisplayTime = (time: string) => {
    if (!time) return placeholder
    const [hours, minutes] = time.split(':')
    const hour24 = parseInt(hours)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${ampm}`
  }

  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) { // 15-minute intervals
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const displayTime = formatDisplayTime(timeString)
        options.push(
          <button
            key={timeString}
            type="button"
            className={cn(
              "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md",
              selectedTime === timeString && "bg-accent text-accent-foreground"
            )}
            onClick={() => {
              setSelectedTime(timeString)
              onTimeChange?.(timeString)
            }}
          >
            {displayTime}
          </button>
        )
      }
    }
    return options
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedTime && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {selectedTime ? formatDisplayTime(selectedTime) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Time</label>
            <input
              type="time"
              value={selectedTime}
              onChange={handleTimeChange}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block">Quick Select</label>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {generateTimeOptions()}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}