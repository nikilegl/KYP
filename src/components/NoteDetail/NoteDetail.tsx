const handleAutoSummariseGeneration = async (nativeNotesContent: string) => {

    setAutoSummarising(true)
    
    try {
      // Extract plain text from HTML content
      const plainText = nativeNotesContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 10)
      
      // Generate structured summary with improved logic
      let summaryText = '<h3>Meeting Summary</h3>\n\n'
      
      if (sentences.length > 0) {
        // Purpose of the meeting
        const purposeKeywords = ['purpose', 'objective', 'goal', 'aim', 'meeting', 'discuss', 'review', 'plan']
        const purposeSentence = sentences.find(s => 
          purposeKeywords.some(keyword => s.toLowerCase().includes(keyword))
        )
        
        if (purposeSentence) {
          summaryText += '<h4>Purpose of Meeting</h4>\n<ul>\n<li>' + purposeSentence.trim() + '</li>\n</ul>\n\n'
        }
        
        // Key topics discussed
        const topicKeywords = ['discussed', 'talked about', 'covered', 'addressed', 'mentioned', 'topic', 'issue']
        const topicSentences = sentences.filter(s => 
          topicKeywords.some(keyword => s.toLowerCase().includes(keyword))
        ).slice(0, 3)
        
        if (topicSentences.length > 0) {
          summaryText += '<h4>Key Topics Discussed</h4>\n<ul>\n'
          topicSentences.forEach(sentence => {
            summaryText += '<li>' + sentence.trim() + '</li>\n'
          })
          summaryText += '</ul>\n\n'
        }
        
        // Key outcomes
        const outcomeKeywords = ['decided', 'agreed', 'concluded', 'outcome', 'result', 'action', 'next steps', 'follow up']
        const outcomeSentences = sentences.filter(s => 
          outcomeKeywords.some(keyword => s.toLowerCase().includes(keyword))
        ).slice(0, 3)
        
        if (outcomeSentences.length > 0) {
          summaryText += '<h4>Key Outcomes</h4>\n<ul>\n'
          outcomeSentences.forEach(sentence => {
            summaryText += '<li>' + sentence.trim() + '</li>\n'
          })
          summaryText += '</ul>\n\n'
        }
        
        // Other key points (remaining important sentences)
        const remainingSentences = sentences.filter(s => 
          !purposeKeywords.some(keyword => s.toLowerCase().includes(keyword)) &&
          !topicKeywords.some(keyword => s.toLowerCase().includes(keyword)) &&
          !outcomeKeywords.some(keyword => s.toLowerCase().includes(keyword))
        ).slice(0, 2)
        
        if (remainingSentences.length > 0) {
          summaryText += '<h4>Additional Key Points</h4>\n<ul>\n'
          remainingSentences.forEach(sentence => {
            summaryText += '<li>' + sentence.trim() + '</li>\n'
          })
          summaryText += '</ul>\n'
        }
      } else {
        // Fallback for short content
        summaryText += '<h4>Key Points</h4>\n<ul>\n<li>Meeting notes recorded - please review native notes for details</li>\n</ul>\n'
      }
      
      // Save the generated summary
      const updatedNote = await updateResearchNote(
        note.id,
        { summary: summaryText },
        noteStakeholderIds
      )
      
      if (updatedNote) {
        onUpdate(updatedNote)
      }
      
      // Return the generated summary
      return summaryText
    } catch (error) {
      console.error('Error generating summary:', error)
      throw error
    } finally {
      setAutoSummarising(false)
    }
  }

        <NoteTasksSection
          researchNoteId={note.id}
          projectId={note.project_id}
          tasks={noteTasks}
          availableUsers={availableUsers}