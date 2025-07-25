"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Zap, Crown, Film, LayoutTemplate } from "lucide-react"

interface TemplatePickerProps {
  selectedTemplate: "classic" | "modern" | "capcut"
  onTemplateChange: (template: "classic" | "modern" | "capcut") => void
}

const templates = [
  {
    id: "classic" as const,
    name: "Modern",
    description: "Contemporary style with smooth animations",
    icon: Sparkles,
    features: ["Smooth animations", "Modern typography", "Gradient backgrounds"],
    preview: "bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900",
  },
  {
    id: "modern" as const,
    name: "Classic",
    description: "Simple, elegant design with fade transitions",
    icon: Crown,
        features: ["Fade transitions", "Clean typography", "Minimal design"],

        preview: "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900",

  },
  {
    id: "capcut" as const,
    name: "Template 1",
    description: "Dynamic animations with zoom effects and golden text",
    icon: LayoutTemplate  ,
    features: ["Zoom animations", "Golden Arabic text", "Dark theme", "Spring effects"],
    preview: "bg-gradient-to-br from-slate-900 to-black",
  },
]


export function TemplatePicker({ selectedTemplate, onTemplateChange }: TemplatePickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Choose Video Template</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">Select a style that matches your vision</p>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => {
          const Icon = template.icon
          const isSelected = selectedTemplate === template.id

          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "ring-2 ring-emerald-500 border-emerald-500"
                  : "hover:border-slate-300 dark:hover:border-slate-600"
              }`}
              onClick={() => onTemplateChange(template.id)}
            >
              <CardContent className="p-4 ">
                <div className="flex items-center  gap-4">
                  <div className={`w-20 h-16 rounded-lg ${template.preview} flex items-center justify-center`}>
                    <Icon
                      className={`h-6 w-6 ${
                        template.id === "capcut" ? "text-yellow-400" : "text-slate-600 dark:text-slate-300"
                      }`}
                    />
                  </div>

                  <div className="flex-1 ">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{template.name}</h4>
                      {isSelected && (
                        <Badge variant="default" className="bg-emerald-500">
                          Selected
                        </Badge>
                      )}
                    </div>

                    {/* <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{template.description}</p> */}
{/* 
                    <div className="flex flex-wrap gap-1">
                      {template.features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div> */}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
