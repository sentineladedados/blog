// js/likes-comments.js
import { auth, db } from './firebase.js';
import { signInWithGoogle } from './auth.js';

// Configura botão de curtida
export function setupLikeButton(articleId) {
  const likeButton = document.getElementById('like-button');
  const likeIcon = document.getElementById('like-icon');
  const likeCount = document.getElementById('like-count');
  
  if (!likeButton) return;

  likeButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    
    if (!user) {
      if (confirm('Você precisa fazer login para curtir artigos. Deseja fazer login agora?')) {
        signInWithGoogle();
      }
      return;
    }
    
    try {
      const likeRef = db.collection('likes').doc(`${articleId}_${user.uid}`);
      const doc = await likeRef.get();
      
      if (doc.exists) {
        // Remove a curtida
        await likeRef.delete();
        likeIcon.classList.replace('fas', 'far');
        likeCount.textContent = parseInt(likeCount.textContent) - 1;
      } else {
        // Adiciona curtida
        await likeRef.set({
          articleId,
          userId: user.uid,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        likeIcon.classList.replace('far', 'fas');
        likeCount.textContent = parseInt(likeCount.textContent) + 1;
      }
      
      updateLikeCountText(likeCount.textContent);
      
    } catch (error) {
      console.error("Erro ao atualizar curtida:", error);
      alert("Ocorreu um erro ao processar sua curtida. Tente novamente.");
    }
  });
}

// Carrega as curtidas
export async function loadLikes(articleId) {
  const likeIcon = document.getElementById('like-icon');
  const likeCount = document.getElementById('like-count');
  const likeText = document.getElementById('like-text');
  
  if (!likeCount) return;

  try {
    const snapshot = await db.collection('likes')
      .where('articleId', '==', articleId)
      .get();
      
    likeCount.textContent = snapshot.size;
    updateLikeCountText(snapshot.size);
    
    // Verifica se o usuário atual já curtiu
    const user = auth.currentUser;
    if (user) {
      const userLike = await db.collection('likes')
        .doc(`${articleId}_${user.uid}`)
        .get();
        
      if (userLike.exists) {
        likeIcon.classList.replace('far', 'fas');
      }
    }
    
  } catch (error) {
    console.error("Erro ao carregar curtidas:", error);
  }
}

// Atualiza texto de curtidas
function updateLikeCountText(count) {
  const likeText = document.getElementById('like-count-text');
  if (likeText) {
    likeText.textContent = `${count} ${count === 1 ? 'pessoa curtiu' : 'pessoas curtiram'}`;
  }
}

// Configura formulário de comentários
export function setupCommentForm(articleId) {
  const commentForm = document.getElementById('comment-form');
  
  if (!commentForm) return;

  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    const commentInput = document.getElementById('comment-input');
    const content = commentInput.value.trim();
    
    if (!user) {
      if (confirm('Você precisa fazer login para comentar. Deseja fazer login agora?')) {
        signInWithGoogle();
      }
      return;
    }
    
    if (!content) {
      alert('Por favor, escreva um comentário antes de enviar.');
      return;
    }
    
    try {
      await db.collection('comments').add({
        articleId,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`,
        content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Atualiza contador de comentários
      const commentsCount = document.getElementById('comments-count');
      if (commentsCount) {
        commentsCount.textContent = parseInt(commentsCount.textContent) + 1;
      }
      
      // Limpa o campo
      commentInput.value = '';
      
      // Recarrega comentários
      loadComments(articleId);
      
    } catch (error) {
      console.error("Erro ao enviar comentário:", error);
      alert("Ocorreu um erro ao enviar seu comentário. Tente novamente.");
    }
  });
}

// Carrega comentários
export async function loadComments(articleId) {
  const commentsContainer = document.getElementById('comments-container');
  const commentsCount = document.getElementById('comments-count');
  
  if (!commentsContainer) return;

  commentsContainer.innerHTML = '<p class="text-center py-4">Carregando comentários...</p>';

  try {
    const snapshot = await db.collection('comments')
      .where('articleId', '==', articleId)
      .orderBy('timestamp', 'desc')
      .get();
      
    if (commentsCount) {
      commentsCount.textContent = snapshot.size;
    }
    
    if (snapshot.empty) {
      commentsContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Seja o primeiro a comentar!</p>';
      return;
    }
    
    commentsContainer.innerHTML = '';
    
    snapshot.forEach(doc => {
      const comment = doc.data();
      const date = comment.timestamp.toDate();
      const formattedDate = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      
      commentsContainer.innerHTML += `
        <div class="mb-6 pb-6 border-b border-gray-100">
          <div class="flex items-start">
            <img src="${comment.userPhoto}" alt="${comment.userName}" 
                 class="w-10 h-10 rounded-full mr-3 mt-1">
            <div class="flex-1">
              <div class="flex justify-between items-start">
                <h4 class="font-bold text-gray-800">${comment.userName}</h4>
                <span class="text-sm text-gray-500">${formattedDate}</span>
              </div>
              <p class="text-gray-700 mt-2">${comment.content}</p>
            </div>
          </div>
        </div>
      `;
    });
    
  } catch (error) {
    console.error("Erro ao carregar comentários:", error);
    commentsContainer.innerHTML = '<p class="text-red-500 text-center py-4">Erro ao carregar comentários. Tente recarregar a página.</p>';
  }
}