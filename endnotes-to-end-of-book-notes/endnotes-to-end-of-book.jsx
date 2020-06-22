// Convert InDesign document endnotes to semi-automatic end-of-book endnotes
// Requires CC2018 or later
// Peter Kahrel www.typefi.com


(function () {

	var noteDocument;
	var bookEndNoteStory;
	var originalEndnoteSeparator;
	var dummyEndnoteSeparator = '%#@';
	var noteStarts = [];  // Track whether documents restart numbering

	//---------------------------------------------------------------------------
	// Error messages about missing links and fonts shouldn't stop the script

	function openDocument (f) {
		app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
		if (f.exists) {
			var doc = app.open (f);
		} else {
			doc = null;
		}
		app.scriptPreferences.userInteractionLevel = UserInteractionLevels.INTERACT_WITH_ALL;
		return doc;
	}

	//---------------------------------------------------------------------------
	// The endnote document is open. If there's no 'Notes' frame, stop.
	
	function getNoteDocument () {
		var doc = app.documents.item (app.documents[0].name);
		if (!doc.pages[0].textFrames.item('Notes').isValid) {
			alert ('The notes document lacks a text frame name "Notes".', 'Convert notes', true);
			exit();
		}
		return doc;
	}
	
	//---------------------------------------------------------------------------

	function findEndnoteStory (stories) {
		for (var i = stories.length-1; i >= 0; i--) {
			if (stories[i].isEndnoteStory) {
				return stories[i];
			}
		}
		return null;
	}

	//---------------------------------------------------------------------------
	// Replace the (automatic) endnote references with static numnbers.
	// They'll end up in the endnote number's character style.

	function staticReferences (story, enotes) {
		if (parseInt (app.version) <= 13) {
			for (var i = enotes.length-1; i >= 0; i--) {
				story.insertionPoints[enotes[i].storyOffset+1].contents = String(i+1);
			}
		} else { // From CC2019, endnote.storyOffset is an insertion point, not an integer.
			for (var i = enotes.length-1; i >= 0; i--) {
				story.insertionPoints[enotes[i].storyOffset.index+1].contents = String(i+1);
			}
		}
	}

	// After moving the endnotes to the end of the book, replace the endnote markers 
	// (the numbers, bizarrely the same as footnote markers, ~F) with static numbers.
	
	function staticNumbers (story) {
		app.findChangeGrepOptions.includeFootnotes = false;
		app.findGrepPreferences = null;
		app.findGrepPreferences.findWhat = '^~F';
		var list = story.findGrep();
		for (var i = list.length-1; i >= 0; i--) {
			list[i].contents = String(i+1);
		}
	}


	function staticEndnotesSub (story) {
		var enotes = story.endnotes;
		var enoteStory = enotes[0].texts[0].parentStory;
		staticReferences (story, enotes);
		// Insert the document's name as the section heading in the endnote document.
		// We add @@ so we can find the heading later and format it. More robust
		// than formatting the headings on the fly.
		bookEndNoteStory.insertionPoints[-1].contents = '@@Notes to ' + story.parent.name.replace(/\.indd$/,'') + '\r';
		for (var i = 0; i < enotes.length; i++) {
			enotes[i].texts[0].duplicate (LocationOptions.AFTER, bookEndNoteStory.insertionPoints[-1]);
			bookEndNoteStory.insertionPoints[-1].contents = '\r';
		}
		staticNumbers (bookEndNoteStory);
	}

	//---------------------------------------------------------------------

	function moveEndnotesToEnd (doc) {
		if (doc.endnoteOptions.scopeValue !== EndnoteScope.ENDNOTE_DOCUMENT_SCOPE || !doc.stories.everyItem().endnotes.length) {
			return;
		}
		var stories = doc.stories.everyItem().getElements();
		originalEndnoteSeparator = doc.endnoteOptions.endnoteSeparatorText;
		noteStarts.push (doc.endnoteOptions.startEndnoteNumberAt);
		doc.endnoteOptions.endnoteSeparatorText = dummyEndnoteSeparator;
		for (var i = 0; i < stories.length; i++) {
			if (stories[i].textContainers.length && stories[i].endnotes.length && stories[i].textContainers[0].parent instanceof Spread) {
				staticEndnotesSub (stories[i]);
			}
		}
		doc.endnoteOptions.endnoteSeparatorText = originalEndnoteSeparator;
	}

	//-------------------------------------------------------------------
	// Deleting pages would have been easy with Smart Text Reflow,
	// but it turns out that that doesn't work reliably.
	
	function deleteEndnotes (doc) {
		
		function deleteFrames (frames) {
			var n = frames.length-1;
			var offset = frames[n].parentPage.documentOffset;
			frames[n].remove();
			while (n > 0 && doc.pages[offset].pageItems.length === 0) {
				doc.pages[offset].remove();
				n--;
				offset--;
				frames[n].remove()
			}
			if (doc.pages[offset].pageItems.length === 0) {
				doc.pages[offset].remove();
			}
		}

		var stories = doc.stories.everyItem().getElements();
		for (var i = stories.length-1; i >= 0; i--) {
			if (stories[i].isEndnoteStory) {
				deleteFrames (stories[i].textContainers);
			}
		}
	}

	//-------------------------------------------------------------------
	
	function endOfBookNotes () {
		var chapters = app.books[0].bookContents.everyItem().getElements();
		var doc;
		for (var i = 0; i < chapters.length-1; i++) {
			doc = openDocument (chapters[i].fullName);
			if (!doc) {
				alert (chapters[i].name + ' does not exist.');
				exit();
			}
			moveEndnotesToEnd (doc);
			deleteEndnotes (doc);
			doc.save (doc.fullName);
			doc.close (SaveOptions.NO);
		}
	}

	//-------------------------------------------------------------------
	// Get the section style from the document endnote options. 
	// If it's [Basic P], create a new one.
		
	function getEndnoteSectionStyle (doc) {
		var ps = doc.endnoteOptions.endnoteTitleStyle;
		if (ps == doc.paragraphStyles[1]) {
			ps = doc.paragraphStyles.item ('Endnote section');
			if (!ps.isValid) {
				ps = doc.paragraphStyles.add ({name: 'Endnote section'});
			}
		}
		return ps;
	}

	//-------------------------------------------------------------------
	
	function fixEndnotes() {
		// Delete the (now static) endnote numbers and the separators
		app.findGrepPreferences = app.changeGrepPreferences = null;
		app.findGrepPreferences.findWhat = '^.+?' + dummyEndnoteSeparator;
		bookEndNoteStory.changeGrep();
		
		// Set the endnote style to numbering. Assume that
		// the story's second paragraph is the first note
		// (it follows the heading, which is the first paragraph)
		
		var pstyle = bookEndNoteStory.paragraphs[1].appliedParagraphStyle;
		var cstyle = bookEndNoteStory.parent.characterStyles.item ('Endnote number');
		if (!cstyle.isValid) {
			cstyle = bookEndNoteStory.parent.characterStyles.add ({
				name: 'Endnote number', 
				fontStyle: pstyle.fontStyle,
			});
		}
		pstyle.properties = {
			bulletsAndNumberingListType: ListType.NUMBERED_LIST,
			numberingExpression: '^#' + originalEndnoteSeparator,
			numberingCharacterStyle: cstyle,
		}

		var sectionStyle = getEndnoteSectionStyle (bookEndNoteStory.parent);
		var restart = noteStarts[0] == noteStarts[1];

		var par = bookEndNoteStory.paragraphs.everyItem().getElements();
		for (var i = par.length-1; i >= 0; i--) {
			if (par[i].contents.indexOf('@@') === 0) {
				if (restart) {
					par[i+1].properties = {
						numberingContinue: false,
						numberingStartAt: 1,
					}
				}
				par[i].appliedParagraphStyle = sectionStyle;
				par[i].characters.itemByRange(0,1).contents = '';  // Delete @@
			}
		}
	}

	//====================================================================
	
	if (parseInt (app.version) < 13) {
		alert ('This script requires InDesign CC2018 or later');
		exit();
	}

	if (!confirm ('The book documents are changed and saved by the script. If you do not have copies in a safe place, do not continue with the script.\r\rContinue with the script?', true, ' ')) {
		exit();
	}

	if (app.books.length !== 1) {
		alert ('Open just one book and the notes chapter.');
		exit();
	}

	if (app.documents.length !== 1) {
		alert ('Open just one document: the notes chapter.');
		exit();
	}

	// We don't want InDesign to update the documents while we're working on them.
	var autonumbering = app.books[0].automaticPagination;
	app.books[0].automaticPagination = false;
	
	// The note document is open, but we must check 
	// whether the named frame is present.
	noteDocument = getNoteDocument();

	bookEndNoteStory = noteDocument.pages[0].textFrames.item('Notes').parentStory;
	endOfBookNotes();
	fixEndnotes();

	if (autonumbering) {
		app.books[0].automaticPagination = true;
		app.books[0].repaginate();
		app.books[0].updateChapterAndParagraphNumbers();
	}

	app.books[0].save();

}());