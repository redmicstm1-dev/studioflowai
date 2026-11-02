  useEffect(() => {
    if (!supabase || !storyId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchStoryData = async () => {
      setLoading(true);

      // 1. Fetch Story Details using supabase!
      const { data: storyData, error: storyError } = await supabase!
        .from("project_stories")
        .select("*")
        .eq("id", storyId)
        .single();

      if (!mounted) return;

      if (storyError || !storyData) {
        setNotice("Story not found or access denied.");
        setLoading(false);
        return;
      }

      setStory(storyData);
      setTitle(storyData.title || "");
      setLogline(storyData.logline || "");
      setSynopsis(storyData.synopsis || "");
      setGenre(storyData.genre || "");

      // 2. Fetch Characters
      const { data: charData } = await supabase!
        .from("project_characters")
        .select("*")
        .eq("story_id", storyId)
        .order("created_at", { ascending: false });

      if (charData && mounted) setCharacters(charData);

      // 3. Fetch Episodes
      const { data: epData } = await supabase!
        .from("project_episodes")
        .select("*")
        .eq("story_id", storyId)
        .order("episode_number", { ascending: true });

      if (epData && mounted) setEpisodes(epData);

      // 4. Fetch Scripts
      const { data: scriptData } = await supabase!
        .from("project_scripts")
        .select("*")
        .eq("story_id", storyId)
        .order("created_at", { ascending: false });

      if (scriptData && mounted) setScripts(scriptData);

      setLoading(false);
    };

    fetchStoryData();

    return () => {
      mounted = false;
    };
  }, [storyId]);

  async function handleSaveOverview(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !story) return;

    setSavingOverview(true);
    setNotice("");

    const { error } = await supabase!
      .from("project_stories")
      .update({
        title: title.trim(),
        logline: logline.trim(),
        synopsis: synopsis.trim(),
        genre: genre.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", story.id);

    if (error) {
      setNotice(`Error updating story: ${error.message}`);
    } else {
      setNotice("Story overview saved successfully!");
    }
    setSavingOverview(false);
  }

  async function handleAddCharacter(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !story || !charName.trim()) return;

    const { data, error } = await supabase!
      .from("project_characters")
      .insert([
        {
          project_id: story.project_id,
          story_id: story.id,
          name: charName.trim(),
          role: charRole.trim(),
          age: charAge.trim(),
          description: charDesc.trim(),
        },
      ])
      .select()
      .single();

    if (error) {
      setNotice(`Error adding character: ${error.message}`);
    } else if (data) {
      setCharacters([data, ...characters]);
      setShowCharModal(false);
      setCharName("");
      setCharRole("");
      setCharAge("");
      setCharDesc("");
      setNotice("Character added successfully!");
    }
  }

  async function handleDeleteCharacter(id: string) {
    if (!supabase) return;
    const { error } = await supabase!.from("project_characters").delete().eq("id", id);
    if (!error) {
      setCharacters(characters.filter((c) => c.id !== id));
      setNotice("Character removed.");
    }
  }

  async function handleAddEpisode(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !story || !epTitle.trim()) return;

    const { data, error } = await supabase!
      .from("project_episodes")
      .insert([
        {
          project_id: story.project_id,
          story_id: story.id,
          episode_number: epNumber,
          title: epTitle.trim(),
          synopsis: epSynopsis.trim(),
          status: "draft",
        },
      ])
      .select()
      .single();

    if (error) {
      setNotice(`Error adding episode: ${error.message}`);
    } else if (data) {
      setEpisodes([...episodes, data]);
      setShowEpModal(false);
      setEpTitle("");
      setEpSynopsis("");
      setEpNumber(episodes.length + 2);
      setNotice("Episode create successfully!");
    }
  }