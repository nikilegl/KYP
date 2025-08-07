@@ .. @@
  const [newUserRole, setNewUserRole] = useState({ name: '', colour: '#3B82F6', icon: 'Person' })
  const [creatingUserRole, setCreatingUserRole] = useState(false)
  const [updatingUserRole, setUpdatingUserRole] = useState(false)

  const handleCreateUserRole = async (e: React.FormEvent) => {
    e.preventDefault()
@@ .. @@
        userRole={{
          name: editingUserRole.name,
          colour: editingUserRole.colour,
          icon: editingUserRole.icon || 'Person'
        }}
        loading={updatingUserRole}
        onUpdate={(updates) => setEditingUserRole({ ...editingUserRole, ...updates })}
        onSubmit={handleUpdateUserRole}
        onClose={() => setEditingUserRole(null)}
      />
    )}

    <UserRoleTable