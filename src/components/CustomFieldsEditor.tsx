import { useState } from 'react'
import { CustomFieldDefinition } from '../types'

interface CustomFieldsEditorProps {
    customFields?: Record<string, any>
    onChange: (customFields: Record<string, any>) => void
}

export function CustomFieldsEditor({ customFields = {}, onChange }: CustomFieldsEditorProps) {
    const [fields, setFields] = useState<CustomFieldDefinition[]>(
        Object.entries(customFields).map(([key, value]) => ({
            key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'text',
            value
        }))
    )
    const [newFieldKey, setNewFieldKey] = useState('')
    const [newFieldLabel, setNewFieldLabel] = useState('')
    const [newFieldType, setNewFieldType] = useState<CustomFieldDefinition['type']>('text')

    const handleAddField = () => {
        if (!newFieldKey.trim()) return

        const key = newFieldKey.toLowerCase().replace(/\s+/g, '_')
        const defaultValue = newFieldType === 'number' ? 0 : newFieldType === 'boolean' ? false : ''

        const newField: CustomFieldDefinition = {
            key,
            label: newFieldLabel || newFieldKey,
            type: newFieldType,
            value: defaultValue
        }

        const updatedFields = [...fields, newField]
        setFields(updatedFields)
        updateCustomFields(updatedFields)

        // Reset form
        setNewFieldKey('')
        setNewFieldLabel('')
        setNewFieldType('text')
    }

    const handleUpdateField = (index: number, value: any) => {
        const updatedFields = [...fields]
        updatedFields[index].value = value
        setFields(updatedFields)
        updateCustomFields(updatedFields)
    }

    const handleDeleteField = (index: number) => {
        const updatedFields = fields.filter((_, i) => i !== index)
        setFields(updatedFields)
        updateCustomFields(updatedFields)
    }

    const updateCustomFields = (updatedFields: CustomFieldDefinition[]) => {
        const customFieldsObj = updatedFields.reduce((acc, field) => {
            acc[field.key] = field.value
            return acc
        }, {} as Record<string, any>)
        onChange(customFieldsObj)
    }

    return (
        <div className="space-y-4">
            <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-2">Custom Fields</h3>
                <p className="text-sm text-gray-600">Add custom fields to your service (e.g., difficulty level, min age, equipment provided)</p>
            </div>

            {/* Existing Fields */}
            {fields.length > 0 && (
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {field.label}
                                </label>
                                {field.type === 'text' && (
                                    <input
                                        type="text"
                                        value={field.value || ''}
                                        onChange={(e) => handleUpdateField(index, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}
                                {field.type === 'number' && (
                                    <input
                                        type="number"
                                        value={field.value || 0}
                                        onChange={(e) => handleUpdateField(index, parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}
                                {field.type === 'boolean' && (
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={field.value || false}
                                            onChange={(e) => handleUpdateField(index, e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-600">Enabled</span>
                                    </label>
                                )}
                                {field.type === 'date' && (
                                    <input
                                        type="date"
                                        value={field.value || ''}
                                        onChange={(e) => handleUpdateField(index, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                )}
                            </div>
                            <button
                                onClick={() => handleDeleteField(index)}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete field"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add New Field */}
            <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Add New Field</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Field Name
                        </label>
                        <input
                            type="text"
                            value={newFieldKey}
                            onChange={(e) => setNewFieldKey(e.target.value)}
                            placeholder="e.g., difficulty_level"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Label (Optional)
                        </label>
                        <input
                            type="text"
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                            placeholder="e.g., Difficulty Level"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                        </label>
                        <select
                            value={newFieldType}
                            onChange={(e) => setNewFieldType(e.target.value as CustomFieldDefinition['type'])}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="boolean">Yes/No</option>
                            <option value="date">Date</option>
                        </select>
                    </div>
                </div>
                <button
                    onClick={handleAddField}
                    disabled={!newFieldKey.trim()}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    Add Field
                </button>
            </div>
        </div>
    )
}
