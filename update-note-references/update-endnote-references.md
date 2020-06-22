# Renumbering endnote references

The endnotes-to-end-of-book script creates endnotes whose references do not update automatically when you add or remove endnotes. But updating the numbers is simple and quick with a separate script, endnotes-references-update.jsx.

## Adding an endnote

1. Add a new endnote anywhere in the end-of-book endnote document. Because the endnotes are numbered using InDesign’s paragraph numbering, the numbers in the document are updated automatically.
2. Go to the spot where the endnote reference should appear. Type a digit, e.g. a 0 (zero) and apply the endnote reference style to it. It can be any digit.
3. To update the document’s note references, run the endnotes-references-update.jsx script. It displays a small dialog in which the document’s first note number is shown. Enter a different number if necessary and click OK or press Enter.

## Removing an endnote

Like adding an endnote, removing a note involves three steps.
1. Remove the endnote from the endnote document. The note numbers are updated automatically.
2. Delete the endnote reference in the text.
3. Run the endnotes-references-update.jsx script to update the references. 

Note: When you add and/or remove numbers, there’s no need to run the updater script each time you add or remove a note. Make all changes in a document, then run the script once against that document. To update other documents you have to run the script against against those documents.
