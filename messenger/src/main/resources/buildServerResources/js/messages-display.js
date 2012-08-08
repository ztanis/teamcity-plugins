var md;  /* Shortcut for "messagesDisplay" */

( function( j ) {

    md = {

       /**
        * Action URL, set by hosting page
        */
        action : null,

       /**
        * User messages retrieved and index of the message being displayed currently
        */
        messageDisplayed : -1,
        messages         : new Array(),
        nMessages        : function(){ return md.messages.length },

        /**
         * Displays dialog widget according to options specified
         */
        dialogOpen : function( options ) {

            options = j.extend({ statusMessage : false, urgency : '' }, options );

            j.assert( options.title, 'dialog(): \'options.title\' is not specified' );
            j.assert( options.text,  'dialog(): \'options.text\' is not specified'  );

            md.dialogClose();

            if ( options.statusMessage ) {
                j( '#messages-display-dialog-buttons' ).hide();
                j( '#messages-display-dialog-text'    ).css({ 'margin-top' : '30px',
                                                              'text-align' : 'center' });
            }
            else {
                j( '#messages-display-dialog-buttons' ).show();
                j( '#messages-display-dialog-text'    ).css({ 'margin-top' : '2px',
                                                              'text-align' : 'left' });
            }

            j( '#messages-display-dialog-text' ).text( options.text );

            j( '#messages-display-dialog' ).dialog({ title : options.title.escapeHTML() }).
                                            dialog( 'open' );

            j( 'div.ui-widget-header' ).removeClass( 'dialog-info' ).
                                        removeClass( 'dialog-warning' ).
                                        removeClass( 'dialog-critical' );
            if ( options.urgency )
            {
                j( 'div.ui-widget-header' ).addClass( 'dialog-' + options.urgency );
            }
        },


        /**
         * Dialog "Close" link handler
         */
        dialogClose : function()
        {
            j( '#messages-display-dialog' ).dialog( 'close' );
            return false;
        },


        /**
         * Determines if message specified is deleted
         */
        isDeleted : function( message ) { return j.choose( message.deleted, false )},

        /**
         * Truncates texts that are too long
         */
        cut       : function( text, length ) { return (( text.length > length ) ? ( text.substring( 0, length ) + ' ..' ) : text ) },

        /**
         * Determines if message specified is unknown, i.e., it doesn't exist in md.messages
         */
        unknownMessage : function( message ) { return ( ! md.messages.contains( function( m ){ return ( m.id == message.id ) } )) },


        /**
         * Opens a dialog with details of the message specified by "md.messageDisplayed"
         */
        dialogOpenMessage : function() {

            j.assert(( md.messageDisplayed > -1 ) && ( md.messageDisplayed < md.nMessages()),
                     'dialogOpenMessage(): [' + md.messageDisplayed + '][' + md.nMessages() + '] (md.messageDisplayed, md.nMessages())' );

            var message = md.messages[ md.messageDisplayed ];

            j.assert( ! message.deleted,
                     'dialogOpenMessage(): [' + md.messageDisplayed + '][' + message.id + '] (md.messageDisplayed, message.id - deleted)' );

           /**
            * Calculating "Message X (counter) of Y (total)" dialog status
            */
            var messagesDeletedBefore = md.messages.count( md.isDeleted, 0, md.messageDisplayed  );
            var messagesDeletedAfter  = md.messages.count( md.isDeleted, md.messageDisplayed + 1 );
            var counter               = md.messageDisplayed + 1 - messagesDeletedBefore;
            var total                 = md.nMessages() - messagesDeletedBefore - messagesDeletedAfter;

            j.assert( counter > 0,               'dialogOpenMessage(): [' + counter + '] (counter)' );
            j.assert( total   > 0,               'dialogOpenMessage(): [' + total   + '] (total)' );
            j.assert( counter <= total,          'dialogOpenMessage(): [' + counter + '][' + total + '] (counter, total)' );
            j.assert( total   <= md.nMessages(), 'dialogOpenMessage(): [' + total   + '][' + md.nMessages() + '] (total, md.nMessages())' );

            j( '#messages-display-counter'       ).text( counter );
            j( '#messages-display-counter-total' ).text( total   );

            // "Prev" button
            j( '#messages-display-dialog-prev' ).enable( counter > 1 );

            // "Next" button
            j( '#messages-display-dialog-next' ).enable( counter < total );

            message.senderName = md.cut( message.senderName, dialog_const.sender_max_length );
            message.text       = md.cut( message.text,       dialog_const.text_max_length   );

            md.dialogOpen({ title   : dialog_const.title_template.evaluate( message ),
                            text    : message.text,
                            urgency : message.urgency });
        },


        /**
         * Makes an Ajax request, retrieves messages for the current user and shows the first one in a dialog
         */
        getMessages    : function() {
            j.get( md.action,
                   { t: j.now() },
                   function ( newMessages ) /* JSON array of messages, as sent by MessagesDisplayController.handleRequest() */
                   {
                       if ( newMessages && newMessages.length )
                       {
                           var isUpdate =
                               (( md.nMessages() < 1 )                   || // No existing message yet
                                ( md.nMessages() != newMessages.length ) || // Number of messages on the server has changed
                                ( newMessages.any( md.unknownMessage )));   // Some of new messages are new

                           if ( isUpdate )
                           {
                               md.messageDisplayed = 0;
                               md.messages         = newMessages.slice( 0 ); // Shallow copy of the messages array

                               j.assert( md.nMessages(), 'getMessages(): [' + md.nMessages() + '] (md.nMessages())' );

                               md.dialogOpenMessage();
                           }
                       }
                       else
                       {
                           md.dialogClose();
                       }
                   },
                   'json'
            );
        },


        /**
         * Message "Prev" link handler
         */
        prevMessage : function() {

            if ( md.messageDisplayed > 0 )
            {
                var  prevMessage;
                for( prevMessage = md.messageDisplayed - 1; md.messages[ prevMessage ].deleted; prevMessage-- ){}

                j.assert(( prevMessage > -1 ) && ( prevMessage < md.messageDisplayed ),
                         '"Prev" click: [' + prevMessage + '][' + md.messageDisplayed + '] (prevMessage, md.messageDisplayed)' );

                md.messageDisplayed = prevMessage;
                md.dialogOpenMessage();
            }

            return false;
        },


        /**
         * Message "Next" link handler
         */
        nextMessage : function() {

            if ( md.messageDisplayed < ( md.nMessages() - 1 ))
            {
                var   nextMessage;
                for ( nextMessage = md.messageDisplayed + 1; md.messages[ nextMessage ].deleted; nextMessage++ ){}

                j.assert(( nextMessage < md.nMessages()) && ( nextMessage > md.messageDisplayed ),
                         '"Next" click: [' + nextMessage + '][' + md.messageDisplayed + '] (nextMessage, md.messageDisplayed)' );

                md.messageDisplayed = nextMessage;
                md.dialogOpenMessage();
            }

            return false;
        },


        /**
         * Message "Delete" link handler
         */
        deleteMessage : function() {

            j( '#messages-display-progress' ).show();

            j.assert(( md.messageDisplayed > -1 ) && ( md.messageDisplayed < md.nMessages()),
                     '"Delete" click: [' + md.messageDisplayed + '] (md.messageDisplayed)' );

            var message = md.messages[ md.messageDisplayed ];

            j.ajax({ url      : md.action,
                     type     : 'POST',
                     data     : { id : message.id },
                     dataType : 'text',
                     success  : function( response ) {

                         /**
                          * If response is not empty - it is an 'id' of deleted message
                          * If response is empty - message was already deleted
                          */

                         if ( response )
                         {
                             j.assert( message.id == response,
                                       '"Delete" click: [' + message.id + '] != [' + response + ']' );
                         }

                         message.deleted = true;

                         md.dialogOpen({ title         : 'Message Deleted',
                                         text          : 'Message "' + message.id + '" ' + ( response ? 'deleted' : 'was already deleted' ),
                                         statusMessage : true });
                        /**
                         * Invoked in one second, displays next message after the current one is deleted
                         * or closes the dialog if all messages are deleted
                         */
                         ( function(){

                             // Searching for the next not deleted message right to the current message
                             var nextMessage = md.messages.newIndexOf( md.isDeleted, true, md.messageDisplayed + 1 );

                             if ( nextMessage < 0 ) {
                                 // Searching for the previous not deleted message left to the current message
                                 nextMessage = md.messages.newIndexOf( md.isDeleted, true, 0, md.messageDisplayed  );
                             }

                             if ( nextMessage < 0 ) {
                                 // All messages are deleted
                                 md.dialogClose();
                             }
                             else {
                                 md.messageDisplayed = nextMessage;
                                 md.dialogOpenMessage();
                             }

                         }).delay( 1 );
                     },
                     error    : function() {
                         md.dialogOpen({ title         : 'Message not Deleted',
                                         text          : 'Failed to delete message "' + messageId + '"',
                                         statusMessage : true,
                                         urgency       : 'critical' });
                     },
                     complete : function() {
                         j( '#messages-display-progress' ).hide();
                     }
                   });

            return false;
        }
    };


    j( function() {

        /**
         * Dialog message
         */
        j( '#messages-display-dialog' ).dialog({ autoOpen : false,
                                                 height   : dialog_const.height,
                                                 width    : dialog_const.width,
                                                 position : 'top' });
        /**
         * Setting dialog message link handlers: Prev, Next, Close, Delete
         */
        j( '#messages-display-dialog-prev'   ).click( md.prevMessage   );
        j( '#messages-display-dialog-next'   ).click( md.nextMessage   );
        j( '#messages-display-dialog-close'  ).click( md.dialogClose   );
        j( '#messages-display-dialog-delete' ).click( md.deleteMessage );

        /**
         * Setting dialog message keyboard event handlers: Left (Prev), Right (Next), Delete (Delete)
         */
        j( 'body' ).keydown( function( e )
        {
            if ( j( '#messages-display-dialog' ).dialog( 'isOpen' ))
            {
                if ( e.which == 37 ) { j( '#messages-display-dialog-prev'   ).click() } // Left
                if ( e.which == 39 ) { j( '#messages-display-dialog-next'   ).click() } // Right
                if ( e.which == 46 ) { j( '#messages-display-dialog-delete' ).click() } // Delete
            }
        });
    });

})( jQuery.noConflict());
