import React, { useState } from 'react'
import { SegmentedControl } from './SegmentedControl'

export function SegmentedControlShowcase() {
  const [selectedSize, setSelectedSize] = useState('medium')
  const [selectedView, setSelectedView] = useState('grid')
  const [selectedNodeType, setSelectedNodeType] = useState('process')

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Segmented Control</h3>
        <p className="text-gray-600 mb-6">
          A segmented control for selecting between multiple mutually exclusive options.
        </p>
      </div>

      {/* Size Selector Example */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Size Selector</h4>
        <SegmentedControl
          options={[
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' }
          ]}
          value={selectedSize}
          onChange={setSelectedSize}
        />
        <p className="mt-2 text-sm text-gray-500">Selected: {selectedSize}</p>
      </div>

      {/* View Mode Example */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">View Mode</h4>
        <SegmentedControl
          options={[
            { value: 'list', label: 'List' },
            { value: 'grid', label: 'Grid' },
            { value: 'table', label: 'Table' }
          ]}
          value={selectedView}
          onChange={setSelectedView}
        />
        <p className="mt-2 text-sm text-gray-500">Selected: {selectedView}</p>
      </div>

      {/* Node Type Example */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Node Type (User Journey)</h4>
        <SegmentedControl
          options={[
            { value: 'start', label: 'Start' },
            { value: 'process', label: 'Middle' },
            { value: 'end', label: 'End' }
          ]}
          value={selectedNodeType}
          onChange={setSelectedNodeType}
        />
        <p className="mt-2 text-sm text-gray-500">Selected: {selectedNodeType}</p>
      </div>

      {/* Code Example */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Usage Example</h4>
        <pre className="text-xs text-gray-800 overflow-x-auto">
{`import { SegmentedControl } from './components/SegmentedControl'

function MyComponent() {
  const [value, setValue] = useState('medium')

  return (
    <SegmentedControl
      options={[
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' }
      ]}
      value={value}
      onChange={setValue}
    />
  )
}`}
        </pre>
      </div>

      {/* Props Documentation */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Props</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Prop</th>
                <th className="px-4 py-2 text-left font-semibold">Type</th>
                <th className="px-4 py-2 text-left font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-2 font-mono text-xs">options</td>
                <td className="px-4 py-2 font-mono text-xs">SegmentedControlOption[]</td>
                <td className="px-4 py-2">Array of options with value and label</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">value</td>
                <td className="px-4 py-2 font-mono text-xs">string</td>
                <td className="px-4 py-2">Currently selected value</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">onChange</td>
                <td className="px-4 py-2 font-mono text-xs">(value: string) =&gt; void</td>
                <td className="px-4 py-2">Callback fired when selection changes</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">className</td>
                <td className="px-4 py-2 font-mono text-xs">string</td>
                <td className="px-4 py-2">Optional additional CSS classes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

