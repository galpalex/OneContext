import { Card, CardBody } from '../ui/Card'
import { Icon } from '../ui/Icon'

const SUGGESTED_PROMPTS = [
  'Summarize customer history',
  'What are the current risks?',
  'What should I do next?',
] as const

/**
 * The OneContext AI rail occupies its final position and states plainly that it
 * is not wired up yet. Generation runs through a Vercel serverless function that
 * holds GEMINI_API_KEY server-side, which is built in a later iteration.
 */
export function AiRailPlaceholder() {
  return (
    <Card className="oc-ai" labelledBy="oc-ai-title">
      <header className="oc-ai__header">
        <span className="oc-ai__mark" aria-hidden="true">
          <Icon name="sparkle" size={17} />
        </span>
        <div>
          <h2 className="oc-ai__title" id="oc-ai-title">
            OneContext AI
          </h2>
          <p className="oc-ai__context">Based on customer history</p>
        </div>
      </header>

      <CardBody padding="tight">
        <div className="oc-stack">
          <p className="oc-meta">
            Suggested questions become active once insight generation is connected.
          </p>

          <div className="oc-ai__prompts">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="oc-ai__prompt"
                disabled
                aria-disabled="true"
                title="Available in a later iteration"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="oc-banner oc-banner--info">
            <Icon name="info" size={16} />
            <div>
              <p className="oc-banner__title">Not connected yet</p>
              <p>
                Insights will be generated server-side from this customer's stored events, then
                shown with their source references.
              </p>
            </div>
          </div>
        </div>
      </CardBody>

      <p className="oc-ai__disclaimer">
        <Icon name="alert" size={14} />
        AI suggestion - review before applying. OneContext AI never changes CRM data without your
        confirmation.
      </p>
    </Card>
  )
}
