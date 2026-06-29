# Debug Session: Cloud Model Selection Bug

## Symptoms
- **Expected**: Selecting Google (Gemini) as a provider allows generating content with a Gemini model.
- **Actual**: Clicking "Draft" threw an error saying that the model `"gpt-oss:20b-cloud"` (or similar previous model from another provider) was not found in Gemini OIDC API `v1beta`.
- **Reproduction**: Configure a custom model for a local or external provider, switch to Google, and click "Draft".

## Root Cause
1. The `modelName` state was kept across provider changes in the settings sheet.
2. In the UI, the model name select dropdown/input override was ONLY rendered when `provider === "ollama"`.
3. When the user changed the provider from a different provider to Google, `modelName` remained set to the old value (like `"gpt-oss:20b-cloud"`).
4. Since there was no model selection UI rendered for cloud providers, the user had no way to view or correct the active model, leading to API crashes.

## Solution
1. **Added Model Selection for Cloud Providers**: Implemented a model selection dropdown for Gemini, OpenAI, and Anthropic in [SettingsPanel.tsx](file:///d:/Work/linkedin-agent/src/components/SettingsPanel.tsx) with pre-defined lists of models.
2. **Added Custom Model Override**: Allowed users to select "Custom..." from the dropdown to display a text field, enabling custom model specifications (e.g., custom OpenRouter models) for cloud providers.
3. **Reset Model on Provider Change**: Reset the `modelName` to the first model in the list for the newly selected provider whenever `provider` is changed in the dropdown.
