let m_this = undefined;

var pitchKey = [

18, 19, 20, 21, 23, 24, 25, 27, 29, 30.86, 32.7, 32, 36, 38, 41, 43, 46, 48, 51, 55, 58, 61, 65, 69, 73, 77, 82, 87, 92, 103, 110, 116, 123, 130, 138, 146, 155, 164, 174, 184, 195, 207, 220, 233, 246, 261,

    261.626,277.183,293.665,311.127,
    329.628,349.228,369.994,391.995,
    415.305,440.000,466.164,493.883,

    523.251,554.365,587.330,622.254,
    659.255,698.456,739.989,783.991,
    830.609,880.000,932.328,987.767,

    1046.50,1108.73,1174.66,1244.51,
    1318.51,1396.61,1479.98,1567.98];

var Synthesizer = T("OscGen",
{
    //wave: "fami",
    wave: "cos",

    //fami, saw, tri, pulse, konami, cos, sin
    mul: 0.025

}).play();


class Note
{
    constructor(startTimeTicks, pitch, duration, selected, selectedPitchAndTicks=null, currentGridIndex=m_this.GridPreviewIndex)
    {
        this.Pitch = pitch;
        this.StartTimeTicks = startTimeTicks;
        this.Duration = duration;
        this._IsSelected = selected;
        this.CurrentGridIndex = currentGridIndex;

        this.SelectedPitchAndTicks = selectedPitchAndTicks;
        this.SelectedGridIndex = m_this.GridPreviewIndex;
    }

    Move(x_offset, y_offset)
    {
        this.StartTimeTicks += x_offset;
        this.Pitch += y_offset;
    }

    Play(millisecondsPerTick)
    {
        var numberOfPitches = pitchKey.length;
        var pitchIndex = this.Pitch % numberOfPitches;
        var milliseconds = millisecondsPerTick * this.Duration

        var env = T("perc", {a:50, r:milliseconds*1.5});
        var pluckGenerator  = T("PluckGen", {env:env, mul:0.5}).play();
        pluckGenerator.noteOn(this.Pitch, 100);
    }

    OnMoveComplete(sequenceNumber)
    {
        if(this.SelectedPitchAndTicks == null)
        {
            m_this.PushAction({
                Action:'ADD',
                SequenceNumber:sequenceNumber,
                GridIndex:m_this.GridPreviewIndex,
                MoveBuffer:[],
                MoveData:{
                    Note:this
                }
            });
        }

        else
        {
            var [initialPitch, initialStartTime] = this.SelectedPitchAndTicks
            var [pitchDifference, startTimeDifference] = [this.Pitch - initialPitch, this.StartTimeTicks - initialStartTime]
            if((pitchDifference != 0) && (startTimeDifference != 0))
            {
                m_this.PushAction({
                    Action:'MOVE',
                    SequenceNumber:sequenceNumber,
                    GridIndex:m_this.GridPreviewIndex,
                    MoveBuffer:[],
                    MoveData:{
                        Note:this,
                        Move:[startTimeDifference, pitchDifference]
                    }
                });
            }
        }
    }

    set IsSelected(selected)
    {
        //console.log("SN",this.SequenceNumber)
        if(this._IsSelected != selected)
        {
            this._IsSelected = selected;

            //Select an existing note
            if(selected)
            {
                this.SelectedPitchAndTicks = [this.Pitch, this.StartTimeTicks]
                this.SelectedGridIndex = m_this.GridPreviewIndex;
            }
        }
    }

    get IsSelected()
    {
        return this._IsSelected;
    }
	
	HandleGridMoveReset()
	{
		var selectStartGridBuffer = m_this.GridPreviewList[this.SelectedGridIndex];
		var currentGridBuffer = m_this.GridPreviewList[this.CurrentGridIndex];
						
		m_this.DeleteNote(this, 0, currentGridBuffer, false);
		m_this.AddNote(this, 0, selectStartGridBuffer, false);
	}

    ResetPosition()
    {
		var deletion = false;
		
        if(this.SelectedPitchAndTicks != null)
        {
            [this.Pitch,this.StartTimeTicks] = this.SelectedPitchAndTicks;
			
            if(this.CurrentGridIndex != this.SelectedGridIndex)
            {
				this.HandleGridMoveReset();
				deletion = true;
            }            
        }
		
		return deletion;
    }


};

class Model
{
    constructor()
    {
        m_this = this;
        this.Score = [];
        this.GridPreviewList = [this.Score];
        this.GridPreviewIndex = 0;
        this.ActivityStack = []
        this.ActivityIndex = 0;
        this.MaximumActivityStackLength = 100;
    }

    SetCurrentGridPreview(noteArray)
    {
        this.GridPreviewList[this.GridPreviewIndex] = noteArray;
    }

    GotoPreviousGrid()
    {
        if(m_this.GridPreviewIndex > 0)
        {
            m_this.GridPreviewIndex--;
            m_this.Score = m_this.GridPreviewList[m_this.GridPreviewIndex];
        }
    }

    GotoNextGrid()
    {
        if(m_this.GridPreviewIndex < m_this.GridPreviewList.length-1)
        {
            m_this.GridPreviewIndex++;
            m_this.Score = m_this.GridPreviewList[m_this.GridPreviewIndex];
        }
    }

    CreateGridPreview()
    {
        this.GridPreviewList.push([]);
    }

    InsertSorted(array, note)
    {
        array.push(note);
        array.sort(m_this.CompareNotes);
        //TODO: efficient sort
        //var arrayLength = array.length;
        //var index = m_this.BinarySearch(array, note, m_this.CompareNotes)
        //var index = m_this.LinearSearch(array,note);
        //array.splice( index, 0, note );
    }

    SortScoreByTicks()
    {
        m_this.Score.sort(m_this.CompareNotes);
    }

    LinearSearchOfScore(note)
    {
        return m_this.LinearSearch(m_this.Score, note)
    }

    //Return the index of an exact match, or the index where the element would be if it were present
    LinearSearch(array,searchNote)
    {
        var returnIndex2 = undefined;
        var lastCompareResult = undefined;
        console.log("Begin searching for ", searchNote);

        for(var returnIndex in array)
        {
            var otherNote = array[returnIndex];
            var compareResult = m_this.CompareNotes(searchNote, otherNote);

            //1: searchNote > otherNote: keep going
            //-1: searchNote < otherNoteotherNote: stop
            //0: searchNote == otherNote: return the index of an exact match (the pitch and duration are the same), or the index after all 'inexact' matches

            console.log("Searching, index " + returnIndex + ", cmp=" + compareResult, otherNote)
            if((compareResult === 0) || ((lastCompareResult != undefined) && (lastCompareResult != compareResult)))
            {
                if(returnIndex2 == undefined)
                {
                    console.log("Search complete", compareResult, otherNote);
                    returnIndex2 = returnIndex;
                }
            }

            lastCompareResult = compareResult;

        }

        console.log("Search complete. Index ="+returnIndex);
        return returnIndex2;
    }

    BinarySearch(array, element, compare_fn)
    {
        var m = 0;
        var n = array.length - 1;
        while (m <= n) {
            var k = (n + m) >> 1;
            var cmp = m_this.CompareNotes(element, array[k]);
            if (cmp > 0) {
                m = k + 1;
            } else if(cmp < 0) {
                n = k - 1;
            } else {
                return k;
            }
        }
        var returnIndex = -m - 1;
    }


    CompareNotes(note1, note2)
    {
        var nst1 = note1.StartTimeTicks;
        var nst2 = note2.StartTimeTicks;

        //Same note: return immediately
        if(note1 === note2)
        {
            return 0;
        }

        //Note 1 starts after note 2: place note 1 after note 2
        if(nst1 > nst2)
        {
            return 1;
        }

        //Note 1 starts before note 2: place note 1 before note 2
        else if(nst1 < nst2)
        {
            return -1;
        }

        //if the notes have the same start time, put longer duration notes after short duration notes
        //so that searches can find suspensions in adjacent notes more easily
        else
        {
            //Note 1 longer than note 2: place note 1 after note 2
            if(note1.Duration > note2.Duration)
            {
                return 1;
            }
            //Note 1 shorter: place note 1 before note 2
            else if(note1.Duration < note2.Duration)
            {
                return -1;
            }

            //Same duration: doesn't matter
            else
            {
                return 0;
            }
        }
    }

    HandleBatchInsertion(activityStack, action, targetString)
    {
        var stackLength = activityStack.length;
        var pushSuccessful = false;

        if((action.Action === targetString) && (stackLength > 0))
        {
            var stackTop = activityStack[stackLength - 1];

                        //If this move is part of the same sequence number's move, combine it with the top of the stack
            //if((stackTop.Action === targetString) && (stackTop.SequenceNumber == action.SequenceNumber))
            if(stackTop.SequenceNumber == action.SequenceNumber)
            {
                stackTop.MoveBuffer.push(action.MoveData);
                pushSuccessful = true;
                console.log("Batch "+action.Action + ": " + stackTop.MoveBuffer.length + " datums")
            }
        }

        return pushSuccessful;
    }

    PushAction(action)
    {
        var activityStack = m_this.ActivityStack;
        var stackLength = this.ActivityStack.length;
        var actionCases = ["MOVE", "ADD", "DELETE"]
        var pushSuccessful = false;

        console.log("Pushing action", action);

        //If the index doesn't point to the end of the stack, dump all changes
        if(this.ActivityIndex != stackLength-1)
        {
            this.ActivityStack = this.ActivityStack.slice(0,this.ActivityIndex+1);
        }

        //Lose the last action if the stack is full
        if(stackLength >= this.MaximumActivityStackLength)
        {
            this.ActivityStack.pop();
        }

        actionCases.forEach(function(caseString)
        {
            //If a group of actions are happening, push them together
            var pushedToBatch = m_this.HandleBatchInsertion(activityStack, action, caseString);
            if(pushedToBatch)
            {
                pushSuccessful = true;
                return;
            }
        });

        //If a distinct move is happening, push it separately
        if(!pushSuccessful)
        {
            console.log("Distinct "+action.Action)
            action.MoveBuffer.push(action.MoveData);
            m_this.ActivityStack.push(action)
        }

        this.ActivityIndex = this.ActivityStack.length - 1;
        console.log("Stack length:"+this.ActivityStack.length + " index:" +this.ActivityIndex);
    }

    Undo()
    {
        if(this.ActivityIndex >= 0)
        {
            var mostRecentAction = this.ActivityStack[this.ActivityIndex];
            var moveBuffer = mostRecentAction.MoveBuffer;
            var gridBuffer = this.GridPreviewList[mostRecentAction.GridIndex];

            console.log("Undoing " + mostRecentAction.Action + " on " + moveBuffer.length + " notes, SN = " + mostRecentAction.SequenceNumber);

            this.ActivityIndex--;

            //Undo the addition of a note by deleting it
            if(mostRecentAction.Action === 'ADD')
            {
                moveBuffer.forEach(function(moveData)
                {
                    var note = moveData.Note;
                    m_this.DeleteNote(note, 0, gridBuffer, false)
                });
            }

            //Undo the deletion of a note by adding it
            else if(mostRecentAction.Action === 'DELETE')
            {
                moveBuffer.forEach(function(moveData)
                {
                    var note = moveData.Note;
                    m_this.AddNote(note,  0, gridBuffer, false)
                });
            }

            //Undo a move by moving in the opposite direction
            else if(mostRecentAction.Action === 'MOVE')
            {
                moveBuffer.forEach(function(moveData)
                {
                    var note = moveData.Note;
                    var [startTimeDifference, pitchDifference] = moveData.Move;
					
					if(note.CurrentGridIndex != note.SelectedGridIndex)
					{
						note.HandleGridMoveReset();
					}
					
                    note.Move(-startTimeDifference, -pitchDifference);
                });
            }

            gridBuffer.sort(m_this.CompareNotes);
            console.log(this.ActivityStack.length, this.ActivityIndex);
        }

    }

    Redo()
    {
        if(this.ActivityIndex < this.ActivityStack.length-1)
        {
            this.ActivityIndex++;
            var mostRecentAction = this.ActivityStack[this.ActivityIndex]
            var moveBuffer = mostRecentAction.MoveBuffer;
            var gridBuffer = this.GridPreviewList[mostRecentAction.GridIndex];

            console.log("Redoing " + mostRecentAction.Action + " on " + moveBuffer.length + " notes, SN = " + mostRecentAction.SequenceNumber);

            //Redo addition
            if(mostRecentAction.Action === 'ADD')
            {
                moveBuffer.forEach(function(moveData)
                {
                    var note = moveData.Note;
                    m_this.AddNote(note, 0, gridBuffer, false)
                });
            }

            //Redo deletion
            else if(mostRecentAction.Action === 'DELETE')
            {
                moveBuffer.forEach(function(moveData)
                {
                    var note = moveData.Note;
                    m_this.DeleteNote(note, 0, gridBuffer, false)
                });
            }

            //Redo a move
            else if(mostRecentAction.Action === 'MOVE')
            {
                moveBuffer.forEach(function(moveData)
                {
                    var note = moveData.Note;
                    var [startTimeDifference, pitchDifference] = moveData.Move;
                    note.Move(startTimeDifference, pitchDifference);
                });
            }

            gridBuffer.sort(m_this.CompareNotes);
            console.log(this.ActivityStack.length, this.ActivityIndex);
        }


    }

    //Public
    AddNote(note, sequenceNumber, array=this.Score, pushAction=true)
    {
        var gridIndex = this.GridPreviewIndex;

        if(pushAction)
        {
            this.PushAction({
                Action:'ADD',
                SequenceNumber:sequenceNumber,
                GridIndex:m_this.GridPreviewIndex,
                MoveBuffer:[],
                MoveData:{
                    Note:note
                }
            });
        }

        m_this.InsertSorted(array, note);
    }

    DeleteNoteWithIndex(deletionIndex, sequenceNumber, array=this.Score, pushAction=true)
    {
        var numberOfDeletions = 1;
        var deletedNote = this.Score[deletionIndex];
        var gridIndex = this.GridPreviewIndex;

        if(pushAction)
        {
			deletedNote.ResetPosition();
			deletedNote.IsSelected = false;
            this.PushAction({
                Action:'DELETE',
                SequenceNumber:sequenceNumber,
                GridIndex:m_this.GridPreviewIndex,
                MoveBuffer:[],
                MoveData:{
                    Note:deletedNote
                }
            });
        }

        array.splice(deletionIndex, numberOfDeletions)
    }

    DeleteNote(note, sequenceNumber, array=this.Score, pushAction=true)
    {
        for(var deletionIndex in array)
        {
            var otherNote = array[deletionIndex];
            if(otherNote === note)
            {
                break;
            }
        }

        m_this.DeleteNoteWithIndex(deletionIndex,sequenceNumber,array,pushAction)
    }
};
