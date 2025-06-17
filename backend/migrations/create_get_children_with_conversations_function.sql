-- Create function to get children with conversations on a specific date
CREATE OR REPLACE FUNCTION public.get_children_with_conversations_on_date(conversation_date DATE)
RETURNS TABLE (
    id UUID,
    name TEXT,
    parent_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        c.id,
        c.name,
        c.parent_id
    FROM children c
    INNER JOIN chat_messages cm ON c.id = cm.child_id
    WHERE DATE(cm.created_at) = conversation_date
    ORDER BY c.name;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.get_children_with_conversations_on_date(DATE) TO service_role;